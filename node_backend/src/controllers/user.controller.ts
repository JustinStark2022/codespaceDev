// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { db } from "@/db/db";
import { users, screen_time, lesson_progress } from "@/db/schema";
import { eq } from "drizzle-orm";
import logger from "@/utils/logger";
import bcrypt from "bcryptjs";

type UserRow = typeof users.$inferSelect;
type ScreenTimeRow = typeof screen_time.$inferSelect;
type LessonProgressRow = typeof lesson_progress.$inferSelect;

interface AuthenticatedRequest extends Request {
  user?: { id: number; role: string };
}

/** GET /api/user or /api/user/profile */
export const getUser = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    logger.warn("getUser called without authenticated user.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result: UserRow[] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!result.length) {
      logger.warn("User not found in DB for getUser.", { userId });
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...safeUser } = result[0] as UserRow & { password?: string };
    logger.debug("Successfully fetched user details for getUser.", { userId });
    return res.json(safeUser);
  } catch (err: any) {
    logger.error(`Error fetching user in getUser: ${err.message}`, { userId });
    return res.status(500).json({ message: "Failed to fetch user details." });
  }
};

/** GET /api/user/children */
export const getChildren = async (req: AuthenticatedRequest, res: Response) => {
  const parentId = req.user?.id;
  if (!parentId) {
    logger.warn("getChildren called without authenticated user (parent).");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const children: UserRow[] = await db
      .select()
      .from(users)
      .where(eq(users.parent_id, parentId));

    logger.info("Fetched children for parent.", { parentId, count: children.length });

    const results = await Promise.all(
      children.map(async (child: UserRow) => {
        try {
          const screenTimeRecords: ScreenTimeRow[] = await db
            .select()
            .from(screen_time)
            .where(eq(screen_time.user_id, child.id));

          const screenTime = screenTimeRecords.length ? screenTimeRecords[0] : null;

          const progress: LessonProgressRow[] = await db
            .select()
            .from(lesson_progress)
            .where(eq(lesson_progress.user_id, child.id));

          const completedCount = progress.filter((p) => p.completed).length;

          return {
            ...child,
            screenTime: screenTime
              ? {
                  allowedTimeMinutes: screenTime.allowed_time_minutes ?? 120,
                  usedTimeMinutes: screenTime.used_time_minutes ?? 0,
                }
              : null,
            totalLessons: progress.length,
            completedLessons: completedCount,
          };
        } catch (childErr: any) {
          logger.warn(
            `Error fetching child metrics, using defaults: ${childErr.message}`,
            { childId: child.id }
          );
          return {
            ...child,
            screenTime: null,
            totalLessons: 0,
            completedLessons: 0,
          };
        }
      })
    );

    logger.debug("Successfully fetched children details with metrics.", { parentId });
    return res.json(results);
  } catch (err: any) {
    logger.error(`Error fetching children for parent: ${err.message}`, { parentId });
    return res.status(500).json({ message: "Failed to fetch children." });
  }
};

/** POST /api/user/children */
export const createChild = async (req: AuthenticatedRequest, res: Response) => {
  const { username, password, email, display_name, first_name, last_name, age } = req.body as {
    username?: string;
    password?: string;
    email?: string | null;
    display_name?: string;
    first_name?: string;
    last_name?: string;
    age?: number;
  };

  const parentId = req.user?.id;
  const role = "child";

  if (!parentId) {
    logger.warn("createChild called by unauthenticated user.");
    return res.status(401).json({ message: "Unauthorized: Parent not authenticated" });
  }

  if (!username || !password || !display_name || !first_name || !last_name) {
    logger.warn("Missing required fields for createChild.", { parentId, body: req.body });
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const existingUser: UserRow[] = await db.select().from(users).where(eq(users.username, username));
    if (existingUser.length) {
      logger.warn("Attempt to create child with existing username.", { parentId, username });
      return res.status(400).json({ message: "Username already taken." });
    }

    if (email) {
      const existingEmail: UserRow[] = await db.select().from(users).where(eq(users.email, email));
      if (existingEmail.length) {
        logger.warn("Attempt to create child with existing email.", { parentId, email });
        return res.status(400).json({ message: "Email already registered." });
      }
    }

    const hashedPassword = await bcrypt.hash(password!, 10);

    const inserted = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        email: email || null,
        display_name,
        role,
        parent_id: parentId,
        first_name,
        last_name,
        age: typeof age === "number" ? age : null,
      })
      .returning();

    if (!inserted.length) {
      logger.error("Failed to insert new child user into DB.", { parentId, username });
      return res.status(500).json({ message: "Failed to create user" });
    }

    const createdChild = inserted[0] as UserRow & { password?: string };
    logger.info("Child account created successfully.", {
      parentId,
      childId: createdChild.id,
      username: createdChild.username,
    });

    const { password: _pw, ...safeChild } = createdChild;
    return res.status(201).json(safeChild);
  } catch (err: any) {
    logger.error(`Error creating child account: ${err.message}`, {
      parentId,
      body: req.body,
    });
    return res.status(500).json({ message: "Failed to create child account." });
  }
};

/** GET /api/user/children/:id */
export const getChildProfile = async (req: AuthenticatedRequest, res: Response) => {
  const childId = parseInt(req.params.id, 10);
  const parentId = req.user?.id;

  if (!parentId) {
    logger.warn("getChildProfile called without authenticated parent.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const childRows: UserRow[] = await db
      .select()
      .from(users)
      .where(eq(users.id, childId))
      .limit(1);

    const child = childRows[0];
    if (!child || child.parent_id !== parentId) {
      logger.warn("Child not found or doesn't belong to parent.", { parentId, childId });
      return res.status(404).json({ message: "Child not found" });
    }

    const { password, ...safeChild } = child as UserRow & { password?: string };
    logger.debug("Successfully fetched child profile.", { parentId, childId });
    return res.json(safeChild);
  } catch (err: any) {
    logger.error(`Error fetching child profile: ${err.message}`, { parentId, childId });
    return res.status(500).json({ message: "Failed to fetch child profile." });
  }
};

/** PUT /api/user/children/:id */
export const updateChildProfile = async (req: AuthenticatedRequest, res: Response) => {
  const childId = parseInt(req.params.id, 10);
  const parentId = req.user?.id;
  const { first_name, last_name, display_name, email } = req.body as Partial<UserRow>;

  if (!parentId) {
    logger.warn("updateChildProfile called without authenticated parent.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const existingRows: UserRow[] = await db
      .select()
      .from(users)
      .where(eq(users.id, childId))
      .limit(1);

    const existingChild = existingRows[0];
    if (!existingChild || existingChild.parent_id !== parentId) {
      logger.warn("Child not found or doesn't belong to parent.", { parentId, childId });
      return res.status(404).json({ message: "Child not found" });
    }

    const updatedRows: (UserRow & { password?: string })[] = await db
      .update(users)
      .set({
        first_name: first_name ?? existingChild.first_name,
        last_name: last_name ?? existingChild.last_name,
        display_name: display_name ?? existingChild.display_name,
        email: email ?? existingChild.email,
      })
      .where(eq(users.id, childId))
      .returning();

    const updatedChild = updatedRows[0];
    if (!updatedChild) {
      logger.error("Failed to update child profile.", { parentId, childId });
      return res.status(500).json({ message: "Failed to update child profile" });
    }

    const { password, ...safeChild } = updatedChild;
    logger.info("Child profile updated successfully.", { parentId, childId });
    return res.json(safeChild);
  } catch (err: any) {
    logger.error(`Error updating child profile: ${err.message}`, { parentId, childId });
    return res.status(500).json({ message: "Failed to update child profile." });
  }
};