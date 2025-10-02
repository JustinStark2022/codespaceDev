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

/** Normalize DB user row → client shape */
function toClientUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    parentId: row.parent_id,
    firstName: row.first_name,
    lastName: row.last_name,
    createdAt: row.created_at,
    isParent: row.role === "parent",
  };
}

/** GET /api/user */
export const getUser = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    logger.warn("getUser called without authenticated user.");
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const row = rows[0];
    if (!row) {
      logger.warn("User not found in DB for getUser.", { userId });
      return res.status(404).json({ message: "User not found" });
    }
    logger.debug("Successfully fetched user details.", { userId });
    return res.json(toClientUser(row));
  } catch (err: any) {
    logger.error("Error fetching user in getUser", { err, userId });
    return res.status(500).json({ message: "Failed to fetch user details." });
  }
};

/** GET /api/user/children (list children accounts of a parent) */
export const getChildren = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "parent") {
    logger.warn("getChildren called by non-parent user.", { userId: req.user?.id });
    return res.status(403).json({ message: "Forbidden" });
  }
  const parentId = req.user.id;  // (requireAuth guarantees req.user exists if authenticated)
  try {
    const children = await db.select().from(users).where(eq(users.parent_id, parentId));
    logger.info("Fetched children for parent.", { parentId, count: children.length });
    // Fetch additional data for each child (screen time, lesson progress)
    const results = await Promise.all(children.map(async child => {
      try {
        const screenTimeRecords = await db.select().from(screen_time).where(eq(screen_time.user_id, child.id));
        const st = screenTimeRecords[0] ?? null;
        const progressRecords = await db.select().from(lesson_progress).where(eq(lesson_progress.user_id, child.id));
        const completedCount = progressRecords.filter(p => p.completed).length;
        return {
          ...toClientUser(child),
          screenTime: st ? {
            allowedTimeMinutes: st.allowed_time_minutes ?? 0,
            usedTimeMinutes: st.used_time_minutes ?? 0,
            updatedAt: st.updated_at ?? null,
          } : null,
          totalLessons: progressRecords.length,
          completedLessons: completedCount,
        };
      } catch (childErr: any) {
        logger.warn("Error fetching metrics for child, using defaults.", { childId: child.id, error: childErr.message });
        return {
          ...toClientUser(child),
          screenTime: null,
          totalLessons: 0,
          completedLessons: 0,
        };
      }
    }));
    return res.json(results);
  } catch (err: any) {
    logger.error("Error fetching children for parent", { err, parentId });
    return res.status(500).json({ message: "Failed to fetch children." });
  }
};

/** POST /api/user/children (create a new child account) */
export const createChild = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== "parent") {
    logger.warn("createChild called by non-parent user.", { userId: req.user?.id });
    return res.status(403).json({ message: "Forbidden" });
  }
  // Extract expected fields (assuming body is parsed from FormData by multer as well as JSON)
  const { username, password, email, display_name, first_name, last_name } = req.body as {
    username?: string;
    password?: string;
    email?: string | null;
    display_name?: string;
    first_name?: string;
    last_name?: string;
  };
  const parentId = req.user.id;
  if (!username || !password || !first_name || !last_name || !display_name) {
    logger.warn("Missing required fields for createChild.", { parentId, body: req.body });
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    // Ensure username (and email, if provided) are unique
    const [existingByUsername] = await db.select().from(users).where(eq(users.username, username));
    if (existingByUsername) {
      logger.warn("Username already taken (createChild).", { parentId, username });
      return res.status(400).json({ message: "Username already taken." });
    }
    if (email) {
      const [existingByEmail] = await db.select().from(users).where(eq(users.email, email));
      if (existingByEmail) {
        logger.warn("Email already registered (createChild).", { parentId, email });
        return res.status(400).json({ message: "Email already registered." });
      }
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const inserted = await db.insert(users).values({
      username,
      password: hashedPassword,
      email: email || null,
      display_name,
      role: "child",
      parent_id: parentId,
      first_name,
      last_name,
    }).returning();
    const createdChild = inserted[0];
    if (!createdChild) {
      logger.error("Failed to insert new child user.", { parentId, username });
      return res.status(500).json({ message: "Failed to create user" });
    }
    logger.info("Child account created successfully.", { parentId, childId: createdChild.id, username });
    return res.status(201).json(toClientUser(createdChild));
  } catch (err: any) {
    logger.error("Error creating child account.", { parentId, error: err.message });
    return res.status(500).json({ message: "Failed to create child account." });
  }
};

/** GET /api/user/children/:id (get a specific child’s profile, parent only) */
export const getChildProfile = async (req: AuthenticatedRequest, res: Response) => {
  const childId = Number(req.params.id);
  const parentId = req.user?.id;
  if (!parentId) {
    logger.warn("getChildProfile called without auth parent.");
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!Number.isFinite(childId)) {
    return res.status(400).json({ message: "Invalid child id" });
  }
  try {
    const rows = await db.select().from(users).where(eq(users.id, childId)).limit(1);
    const child = rows[0];
    if (!child || child.parent_id !== parentId) {
      // Note: returning 404 to avoid revealing whether the child exists if not authorized
      logger.warn("Child not found or not owned by parent.", { parentId, childId });
      return res.status(404).json({ message: "Child not found" });
    }
    logger.debug("Successfully fetched child profile.", { parentId, childId });
    return res.json(toClientUser(child));
  } catch (err: any) {
    logger.error("Error fetching child profile.", { parentId, childId, error: err.message });
    return res.status(500).json({ message: "Failed to fetch child profile." });
  }
};

/** PUT /api/user/children/:id (update a child’s profile fields, parent only) */
export const updateChildProfile = async (req: AuthenticatedRequest, res: Response) => {
  const childId = Number(req.params.id);
  const parentId = req.user?.id;
  const { first_name, last_name, display_name, email } = req.body || {};
  if (!parentId) {
    logger.warn("updateChildProfile called without auth parent.");
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!Number.isFinite(childId)) {
    return res.status(400).json({ message: "Invalid child id" });
  }
  try {
    const rows = await db.select().from(users).where(eq(users.id, childId)).limit(1);
    const existingChild = rows[0];
    if (!existingChild || existingChild.parent_id !== parentId) {
      logger.warn("Child not found or not owned by parent (update).", { parentId, childId });
      return res.status(404).json({ message: "Child not found" });
    }
    // Build patch object with only provided fields
    const patch: Partial<typeof users.$inferInsert> = {};
    if (typeof first_name === "string") patch.first_name = first_name;
    if (typeof last_name === "string") patch.last_name = last_name;
    if (typeof display_name === "string") patch.display_name = display_name;
    if (typeof email === "string") patch.email = email;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }
    const updatedRows = await db.update(users).set(patch).where(eq(users.id, childId)).returning();
    const updated = updatedRows[0];
    if (!updated) {
      logger.error("Failed to update child profile in DB.", { parentId, childId });
      return res.status(500).json({ message: "Failed to update child profile." });
    }
    logger.info("Child profile updated successfully.", { parentId, childId });
    return res.json(toClientUser(updated));
  } catch (err: any) {
    logger.error("Error updating child profile.", { parentId, childId, error: err.message });
    return res.status(500).json({ message: "Failed to update child profile." });
  }
};
