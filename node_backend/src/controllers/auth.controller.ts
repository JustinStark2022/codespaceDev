// src/controllers/auth.controller.ts
import { Request, Response, type CookieOptions } from "express";
import { db } from "@/db/db";
import { users, dailyVerses } from "@/db/schema";
import { signAuthToken } from "@/middleware/auth.middleware";
import logger from "@/utils/logger";
import { llmService } from "@/services/llm.service";

import bcrypt from "bcryptjs";
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
  display_name: z.string().min(1),  // accept from client to match DB column
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
 * ───────────────────────────────────────────────────────── */
const COOKIE_OPTS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24, // 24h
  path: "/",
};

/** Return a safe user payload (derive displayName from first/last) */
function safeUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.display_name,     // map DB -> camelCase
    role: u.role,
    parentId: u.parent_id,
    firstName: u.first_name,
    lastName: u.last_name,
    createdAt: u.created_at,
    age: u.age ?? null,
    profilePicture: u.profile_picture ?? null,
    isParent: u.role === "parent",
  };
}

// Singleton per-day generation state (non-blocking)
let verseGenDate = "";
let verseGenPromise: Promise<void> | null = null;

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
      role,
      parent_id,
      first_name,
      last_name,
      display_name, // now parsed directly
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
        display_name,  // use provided value
        role,
        parent_id: role === "child" ? (parent_id ?? null) : null,
        first_name,
        last_name,
      })
      .returning()) as Array<typeof users.$inferSelect>;

    const createdUser = inserted[0];
    if (!createdUser) {
      logger.error("Failed to insert user during registration.");
      return res.status(500).json({ message: "Internal server error" });
    }

    const token = signAuthToken({ id: createdUser.id, role: createdUser.role });
    res.cookie("access_token", token, COOKIE_OPTS);
    res.clearCookie("token"); // remove legacy name if present

    logger.info("User registered successfully.", {
      userId: createdUser.id,
      username: createdUser.username,
    });

    return res.status(201).json({
      message: "Registered",
      user: safeUser(createdUser),
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      logger.warn("Validation error during registration.", { issues: err.errors });
      return res
        .status(400)
        .json({ message: err.errors[0]?.message ?? "Invalid input" });
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

    const token = signAuthToken({ id: user.id, role: user.role });
    res.cookie("access_token", token, COOKIE_OPTS);
    res.clearCookie("token"); // legacy cleanup

    logger.info("User logged in successfully.", {
      userId: user.id,
      username,
      role: user.role,
    });

    return res.json({
      message: "Logged in",
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
  res.clearCookie("access_token", { ...COOKIE_OPTS });
  res.clearCookie("token", { ...COOKIE_OPTS }); // legacy
  return res.json({ message: "Logged out successfully." });
};

/** ─────────────────────────────────────────────────────────
 * GET /api/user (aka getMe) - returns { user, children, verseOfDay }
 * ───────────────────────────────────────────────────────── */
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

    // Children (role=child, parent_id = userId)
    const childRows = await db.select().from(users).where(eq(users.parent_id, userId));
    const children = childRows
      .filter((c) => c.role === "child")
      .map(safeUser);

    // Optionally include a verse of the day for parents (using LLM + cache table)
    let verseOfDay:
      | { reference: string; verseText: string; reflection?: string; prayer?: string }
      | null = null;
    let isVerseGenerating = false;

    if (found.role === "parent" && process.env.RUNPOD_API_KEY) {
      const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      // Try existing cached daily verse
      let [row] = await db
        .select()
        .from(dailyVerses)
        .where(eq(dailyVerses.date, todayKey))
        .limit(1);

      if (!row) {
        // Kick off background generation (do NOT await)
        startDailyVerseGeneration(todayKey, userId);
        isVerseGenerating = true;
      } else {
        verseOfDay = {
          reference: row.reference,
          verseText: row.verseText,
          ...(row.reflection ? { reflection: row.reflection } : {}),
          ...(row.prayer ? { prayer: row.prayer } : {}),
        };
      }
    }

    logger.debug("Successfully fetched user details for getMe.", {
      userId,
      childrenCount: children.length,
      hasVerse: !!verseOfDay,
      isVerseGenerating,
    });

    return res.json({
      user: safeUser(found),
      children,
      verseOfDay,
      isVerseGenerating,
    });
  } catch (err: any) {
    logger.error(`Error in getMe: ${err.message}`, { userId, stack: err.stack });
    return res.status(500).json({ message: "Failed to fetch user details." });
  }
};

// Parse labeled raw LLM text into structured fields
function parseDailyVerse(raw: string) {
  const grab = (label: string) => {
    const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n(?:Reference|Verse|Reflection|Prayer):|$)`, "i");
    return raw.match(re)?.[1]?.trim() || "";
  };
  const reference = grab("Reference");
  const verse = grab("Verse");
  const reflection = grab("Reflection");
  const prayer = grab("Prayer");
  if (!reference || !verse) return null;
  return {
    reference,
    verseText: verse,
    reflection: reflection || null,
    prayer: prayer || null,
    raw,
  };
}

// Start background generation (if not already running for date)
function startDailyVerseGeneration(dateKey: string, userId: number) {
  if (verseGenDate === dateKey && verseGenPromise) return;
  verseGenDate = dateKey;
  verseGenPromise = (async () => {
    try {
      const raw = await generateWithTimeout(
        async () =>
          llmService.generateChatResponse(
            "Provide today's Bible Verse of the Day for a Christian family.",
            "Return as plain text with sections labeled exactly:\nReference:\nVerse:\nReflection:\nPrayer:\nNo markdown, no bullets, no extra headers."
          ),
        15000
      );
      const parsed = raw ? parseDailyVerse(raw) : null;
      if (parsed) {
        await db
          .insert(dailyVerses)
          .values({
            date: dateKey,
            reference: parsed.reference,
            verseText: parsed.verseText,
            reflection: parsed.reflection,
            prayer: parsed.prayer,
            rawResponse: parsed.raw,
            generatedByUserId: userId,
          })
          .onConflictDoNothing();
      } else {
        logger.warn("Verse generation produced unusable output", { dateKey });
      }
    } catch (e: any) {
      logger.warn("Background verse generation failed", { dateKey, error: e?.message });
    } finally {
      verseGenPromise = null;
    }
  })();
}

// Promise timeout wrapper
async function generateWithTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T | null> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    fn().catch(() => null),
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
   