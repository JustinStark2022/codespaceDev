// src/controllers/auth.controller.ts
import { db } from "../db/db";
import { users } from "../db/schema";
import { generateToken } from "../utils/token";
import logger from "../utils/logger";

import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Zod-based type validation schema
const newUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3),
  display_name: z.string().min(1),
  role: z.enum(["parent", "child"]),
  parent_id: z.number().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1)
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
};

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

    // Check if username exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (existingUser.length > 0) {
      logger.warn({ username }, "Username already taken during registration.");
      return res.status(400).json({ message: "Username already taken." });
    }

    // Check if email exists
    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingEmail.length > 0) {
      logger.warn({ email }, "Email already registered.");
      return res.status(400).json({ message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const inserted = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        email,
        display_name,
        role,
        parent_id: role === "child" ? parent_id : null,
        first_name,
        last_name,
      })
      .returning() as Array<typeof users.$inferSelect>;
    const createdUser = inserted[0];
    const token = generateToken(createdUser.id, createdUser.role);

    logger.info({ userId: createdUser.id, username: createdUser.username }, "User registered successfully.");

    res
      .cookie("token", token, COOKIE_OPTS)
      .status(201)
      .json({
        id: createdUser.id,
        role: createdUser.role,
        isParent: createdUser.role === "parent",
      });
  } catch (err: any) {
    logger.error(err, "Error during user registration.");
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    return res.status(400).json({ message: err.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    // Find user by username
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (userResult.length === 0) {
      logger.warn({ username }, "Login attempt with non-existent username");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = userResult[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn({ username, userId: user.id }, "Login attempt with invalid password");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        username: user.username 
      },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Remove password from response
    const { password: _, ...safeUser } = user;

    logger.info({ userId: user.id, username, role: user.role }, "User logged in successfully");

    // Return user data in the format expected by frontend
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      parentId: user.parent_id,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: user.created_at,
      isParent: user.role === "parent",
      token
    });
  } catch (err: any) {
    logger.error(err, { username }, "Error during login");
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logoutUser = (req: Request & { user?: { id: number } }, res: Response) => {
  // Assuming verifyToken middleware adds user to req
  const userId = req.user?.id;
  logger.info({ userId }, "User logged out successfully.");
  res.clearCookie("token").json({ message: "Logged out successfully." });
};

export const getMe = async (req: Request & { user?: { id: number } }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    // This case should ideally be caught by verifyToken middleware
    logger.warn("getMe called without authenticated user.");
    return res.status(401).json({ message: "Not authenticated." });
  }

  try {
    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!found) {
      logger.warn({ userId }, "Authenticated user not found in DB for getMe.");
      return res.status(404).json({ message: "User not found." });
    }

    const { password, ...safeUser } = found;
    logger.debug({ userId }, "Successfully fetched user details for getMe.");
    res.json(safeUser);
  } catch (err: any) {
    logger.error(err, { userId }, "Error in getMe.");
    return res.status(500).json({ message: "Failed to fetch user details." });
  }
};
