// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { db } from "@/db/db";
import { users } from "@/db/schema";
import { generateToken } from "@/utils/token";
import logger from "@/utils/logger";

import bcrypt from "bcryptjs"; // <- match your dependencies
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { z } from "zod";

const newUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3),
  display_name: z.string().min(1),
  role: z.enum(["parent", "child"]),
  parent_id: z.number().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24, // 24h
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const parsed = newUserSchema.parse(req.body);
    const { username, password, email, display_name, role, parent_id, first_name, last_name } = parsed;

    const existingUser = await db.select().from(users).where(eq(users.username, username));
    if (existingUser.length > 0) {
      logger.warn("Username already taken during registration.", { username });
      return res.status(400).json({ message: "Username already taken." });
    }

    const existingEmail = await db.select().from(users).where(eq(users.email, email));
    if (existingEmail.length > 0) {
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
    const token = generateToken(createdUser.id, createdUser.role);

    logger.info("User registered successfully.", { userId: createdUser.id, username: createdUser.username });

    return res
      .cookie("token", token, COOKIE_OPTS)
      .status(201)
      .json({ id: createdUser.id, role: createdUser.role, isParent: createdUser.role === "parent" });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      logger.warn("Validation error during registration.", { issues: err.errors });
      return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid input" });
    }
    logger.error(`Error during user registration: ${err.message}`, { stack: err.stack });
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const found = await db.select().from(users).where(eq(users.username, username)).limit(1);
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

    // Keep your JWT shape consistent with your middleware
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, username: user.username },
      process.env.JWT_SECRET as string,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, COOKIE_OPTS);

    const { password: _pw, ...safe } = user;
    logger.info("User logged in successfully.", { userId: user.id, username, role: user.role });

    return res.json({
      ...safe,
      displayName: user.display_name,
      parentId: user.parent_id,
      isParent: user.role === "parent",
      token,
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

export const logoutUser = (_req: Request & { user?: { id: number } }, res: Response) => {
  res.clearCookie("token").json({ message: "Logged out successfully." });
};

export const getMe = async (req: Request & { user?: { id: number } }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    logger.warn("getMe called without authenticated user.");
    return res.status(401).json({ message: "Not authenticated." });
  }

  try {
    const [found] = await db.select().from(users).where(eq(users.id, userId));
    if (!found) {
      logger.warn("Authenticated user not found in DB for getMe.", { userId });
      return res.status(404).json({ message: "User not found." });
    }

    const { password, ...safeUser } = found as typeof users.$inferSelect & { password?: string };
    logger.debug("Successfully fetched user details for getMe.", { userId });
    return res.json(safeUser);
  } catch (err: any) {
    logger.error(`Error in getMe: ${err.message}`, { userId, stack: err.stack });
    return res.status(500).json({ message: "Failed to fetch user details." });
  }
};
