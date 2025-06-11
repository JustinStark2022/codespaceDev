// src/controllers/auth.controller.ts
import { db } from "@/db/db";
import { users } from "@/db/schema";
import { generateToken } from "@/utils/token";
import logger from "@/utils/logger";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
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
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
};
export const registerUser = async (req, res) => {
    try {
        const parsed = newUserSchema.parse(req.body);
        const { username, password, email, display_name, role, parent_id, first_name, last_name, } = parsed;
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
            .returning();
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
    }
    catch (err) {
        logger.error(err, "Error during user registration.");
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        return res.status(400).json({ message: err.message });
    }
};
export const loginUser = async (req, res) => {
    try {
        const { username, password } = loginSchema.parse(req.body);
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.username, username));
        if (!user) {
            logger.warn({ username }, "Login attempt failed: user not found.");
            return res.status(401).json({ message: "Invalid username or password." });
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            logger.warn({ username }, "Login attempt failed: invalid password.");
            return res.status(401).json({ message: "Invalid username or password." });
        }
        const token = generateToken(user.id, user.role);
        logger.info({ userId: user.id, username: user.username }, "User logged in successfully.");
        res
            .cookie("token", token, COOKIE_OPTS)
            .json({
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
        });
    }
    catch (err) {
        logger.error(err, "Error during user login.");
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        return res.status(400).json({ message: err.message });
    }
};
export const logoutUser = (req, res) => {
    // Assuming verifyToken middleware adds user to req
    const userId = req.user?.id;
    logger.info({ userId }, "User logged out successfully.");
    res.clearCookie("token").json({ message: "Logged out successfully." });
};
export const getMe = async (req, res) => {
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
    }
    catch (err) {
        logger.error(err, { userId }, "Error in getMe.");
        return res.status(500).json({ message: "Failed to fetch user details." });
    }
};
