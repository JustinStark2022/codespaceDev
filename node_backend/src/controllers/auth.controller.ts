// src/controllers/auth.controller.ts
// src/controllers/auth.controller.ts
import { Request, Response, type CookieOptions } from "express";
import { db } from "@/db/db";
import { users } from "@/db/schema";
import { generateToken } from "@/utils/token";
import logger from "@/utils/logger";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { z } from "zod";

/** ─────────────────────────────────────────────────────────
 * Validation
 * (coerce parent_id to number when provided as a string)
 * ───────────────────────────────────────────────────────── */
const newUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3),
  display_name: z.string().min(1),
  role: z.enum(["parent", "child"]),
  parent_id: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || Number.isFinite(v), {
      message: "parent_id must be a number",
    }),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/** ─────────────────────────────────────────────────────────
 * Cookie options
 * Make sure this matches your client + environment.
 * ───────────────────────────────────────────────────────── */
const COOKIE_OPTS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production", // false on localhost/http
  maxAge: 1000 * 60 * 60 * 24, // 24h
  path: "/", // important so clearCookie matches
};

/** Helper to return a safe user payload */
function safeUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.display_name,
    role: u.role,
    parentId: u.parent_id,
    firstName: u.first_name,
    lastName: u.last_name,
    createdAt: u.created_at,
    isParent: u.role === "parent",
  };
}

/** ─────────────────────────────────────────────────────────
 * POST /api/register
 * ───────────────────────────────────────────────────────── */
export const registerUser = async (req: Request, res: Response) => {
  try {
    const parsed = newUserSchema.parse(req.body);
    const {
      username,
      password,
      email,
      display_name,
      role,
      parent_id,
      first_name,
      last_name,
    } = parsed;

    // Uniqueness checks
    const [existingByUsername] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    if (existingByUsername) {
      logger.warn("Username already taken during registration.", { username });
      return res.status(400).json({ message: "Username already taken." });
    }

    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (existingByEmail) {
      logger.warn("Email already registered.", { email });
      return res.status(400).json({ message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const inserted = (await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        email,
        display_name,
        role,
        parent_id: role === "child" ? parent_id ?? null : null,
        first_name,
        last_name,
      })
      .returning()) as Array<typeof users.$inferSelect>;

    const createdUser = inserted[0];
    if (!createdUser) {
      logger.error("Failed to insert user during registration.");
      return res.status(500).json({ message: "Internal server error" });
    }

    // Use your existing helper so token shape matches middleware
    const token = generateToken(createdUser.id, createdUser.role);

    logger.info("User registered successfully.", {
      userId: createdUser.id,
      username: createdUser.username,
    });

    res.cookie("token", token, COOKIE_OPTS);

    // Return token as well so client can store in localStorage
    return res.status(201).json({
      message: "Registered",
      token,
      user: safeUser(createdUser),
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      logger.warn("Validation error during registration.", { issues: err.errors });
      return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid input" });
    }
    logger.error(`Error during user registration: ${err.message}`, { stack: err.stack });
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** ─────────────────────────────────────────────────────────
 * POST /api/login
 * ───────────────────────────────────────────────────────── */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const found = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!found.length) {
      logger.warn("Login attempt with non-existent username.", { username });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = found[0] as typeof users.$inferSelect & { password?: string };

    const ok = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!ok) {
      logger.warn("Login attempt with invalid password.", { username, userId: user.id });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Keep JWT shape consistent with middleware: at least { id, role }
    // Use your helper for consistency with register.
    const token = generateToken(user.id, user.role);

    res.cookie("token", token, COOKIE_OPTS);

    logger.info("User logged in successfully.", {
      userId: user.id,
      username,
      role: user.role,
    });

    return res.json({
      message: "Logged in",
      token, // client stores this in localStorage; queryClient also sends cookie
      user: safeUser(user),
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      logger.warn("Validation error during login.", { issues: err.errors });
      return res.status(400).json({ message: "Username and password are required" });
    }
    logger.error(`Error during login: ${err.message}`, { stack: err.stack });
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** ─────────────────────────────────────────────────────────
 * POST /api/logout
 * ───────────────────────────────────────────────────────── */
export const logoutUser = (_req: Request & { user?: { id: number } }, res: Response) => {
  // Use same cookie attributes to clear properly
  res.clearCookie("token", { ...COOKIE_OPTS });
  return res.json({ message: "Logged out successfully." });
};

/** ─────────────────────────────────────────────────────────
 * GET /api/user (aka getMe)
 * Make sure this route is protected by requireAuth middleware.
 * ───────────────────────────────────────────────────────── */
export const getMe = async (req: Request & { user?: { id: number } }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    logger.warn("getMe called without authenticated user.");
    return res.status(401).json({ message: "Not authenticated." });
    // If you ever want to support token in header during getMe without middleware,
    // move verification logic here — but prefer keeping it in requireAuth.
  }

  try {
    const [found] = await db.select().from(users).where(eq(users.id, userId));
    if (!found) {
      logger.warn("Authenticated user not found in DB for getMe.", { userId });
      return res.status(404).json({ message: "User not found." });
    }

    logger.debug("Successfully fetched user details for getMe.", { userId });
    return res.json(safeUser(found));
  } catch (err: any) {
    logger.error(`Error in getMe: ${err.message}`, { userId, stack: err.stack });
    return res.status(500).json({ message: "Failed to fetch user details." });
  }
};
