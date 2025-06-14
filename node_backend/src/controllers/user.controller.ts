// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { db } from "@/db/db";
import { users, screen_time, lesson_progress } from "@/db/schema";
import { eq } from "drizzle-orm";
import logger from "@/utils/logger";
import bcrypt from "bcrypt";


interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const getUser = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    logger.warn("getUser called without authenticated user.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!result.length) {
      logger.warn({ userId }, "User not found in DB for getUser.");
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...safeUser } = result[0];
    logger.debug({ userId }, "Successfully fetched user details for getUser.");
    res.json(safeUser);
  } catch (err: any) {
    logger.error(err, { userId }, "Error fetching user in getUser.");
    return res.status(500).json({ message: "Failed to fetch user details." });
  }
};

export const getChildren = async (req: AuthenticatedRequest, res: Response) => {
  const parentId = req.user?.id;
  if (!parentId) {
    logger.warn("getChildren called without authenticated user (parent).");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const children = await db.select().from(users).where(eq(users.parent_id, parentId));
    logger.info({ parentId, count: children.length }, "Fetched children for parent.");

    // For each child, fetch screen time and lesson progress metrics
    const results = await Promise.all(
      children.map(async (child) => {
        // Screen time record
        const [screenTime] = await db
          .select()
          .from(screen_time)
          .where(eq(screen_time.user_id, child.id));
        // Lesson progress
        const progress = await db
          .select()
          .from(lesson_progress)
          .where(eq(lesson_progress.user_id, child.id));

        const completedCount = progress.filter(p => p.completed).length;

        return {
          ...child,
          screenTime: screenTime || null,
          totalLessons: progress.length,
          completedLessons: completedCount,
        };
      })
    );
    logger.debug({ parentId }, "Successfully fetched children details with metrics.");
    res.json(results);
  } catch (err: any) {
    logger.error(err, { parentId }, "Error fetching children for parent.");
    return res.status(500).json({ message: "Failed to fetch children." });
  }
};

export const createChild = async (req: AuthenticatedRequest, res: Response) => {
  const { username, password, email, display_name, first_name, last_name, age } = req.body;
  // Role is implicitly 'child' when created by a parent
  const role = "child";

  const parentId = req.user?.id;

  if (!parentId) {
    logger.warn("createChild called by unauthenticated user.");
    return res.status(401).json({ message: "Unauthorized: Parent not authenticated" });
  }

  if (!username || !password || !display_name || !first_name || !last_name) {
    logger.warn({ parentId, body: req.body }, "Missing required fields for createChild.");
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Check if username exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (existingUser.length > 0) {
      logger.warn({ parentId, childUsername: username }, "Attempt to create child with existing username.");
      return res.status(400).json({ message: "Username already taken." });
    }

    // Check if email exists (optional, depending on requirements for child accounts)
    if (email) {
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (existingEmail.length > 0) {
        logger.warn({ parentId, childEmail: email }, "Attempt to create child with existing email.");
        return res.status(400).json({ message: "Email already registered." });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
      })
      .returning();

    if (!Array.isArray(inserted) || inserted.length === 0) {
      logger.error({ parentId, childUsername: username }, "Failed to insert new child user into DB.");
      return res.status(500).json({ message: "Failed to create user" });
    }
    
    const createdChild = inserted[0];
    logger.info({ parentId, childId: createdChild.id, childUsername: createdChild.username }, "Child account created successfully.");
    const { password: _, ...safeChild } = createdChild;
    res.status(201).json(safeChild);

  } catch (err: any) {
    logger.error(err, { parentId, body: req.body }, "Error creating child account.");
    return res.status(500).json({ message: "Failed to create child account." });
  }
};

export const getChildProfile = async (req: AuthenticatedRequest, res: Response) => {
  const childId = parseInt(req.params.id);
  const parentId = req.user?.id;

  if (!parentId) {
    logger.warn("getChildProfile called without authenticated parent.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const [child] = await db
      .select()
      .from(users)
      .where(eq(users.id, childId))
      .limit(1);

    if (!child || child.parent_id !== parentId) {
      logger.warn({ parentId, childId }, "Child not found or doesn't belong to parent.");
      return res.status(404).json({ message: "Child not found" });
    }

    const { password, ...safeChild } = child;
    logger.debug({ parentId, childId }, "Successfully fetched child profile.");
    res.json(safeChild);
  } catch (err: any) {
    logger.error(err, { parentId, childId }, "Error fetching child profile.");
    return res.status(500).json({ message: "Failed to fetch child profile." });
  }
};

export const updateChildProfile = async (req: AuthenticatedRequest, res: Response) => {
  const childId = parseInt(req.params.id);
  const parentId = req.user?.id;
  const { first_name, last_name, display_name, email } = req.body;

  if (!parentId) {
    logger.warn("updateChildProfile called without authenticated parent.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const [existingChild] = await db
      .select()
      .from(users)
      .where(eq(users.id, childId))
      .limit(1);

    if (!existingChild || existingChild.parent_id !== parentId) {
      logger.warn({ parentId, childId }, "Child not found or doesn't belong to parent.");
      return res.status(404).json({ message: "Child not found" });
    }

    const [updatedChild] = await db
      .update(users)
      .set({
        first_name: first_name || existingChild.first_name,
        last_name: last_name || existingChild.last_name,
        display_name: display_name || existingChild.display_name,
        email: email || existingChild.email,
      })
      .where(eq(users.id, childId))
      .returning();

    if (!updatedChild) {
      logger.error({ parentId, childId }, "Failed to update child profile.");
      return res.status(500).json({ message: "Failed to update child profile" });
    }

    const { password, ...safeChild } = updatedChild;
    logger.info({ parentId, childId }, "Child profile updated successfully.");
    res.json(safeChild);
  } catch (err: any) {
    logger.error(err, { parentId, childId }, "Error updating child profile.");
    return res.status(500).json({ message: "Failed to update child profile." });
  }
};
  