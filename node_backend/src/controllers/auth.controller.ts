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
  display_name: z.string().min(1), // if your DB truly has this column
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

/** Return a safe user payload */
function safeUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName:
      (u as any).display_name ||
      [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
      u.username,
    role: u.role,
    parentId: u.parent_id,
    firstName: u.first_name,
    lastName: u.last_name,
    createdAt: u.created_at,
    age: (u as any).age ?? null,
    profilePicture: (u as any).profile_picture ?? null,
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
      display_name, // REQUIRED by your DB schema
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

    // 👇 Type the payload to EXACTLY match the table's insert shape
    type UsersInsert = typeof users.$inferInsert;
    const toInsert: UsersInsert = {
      username,
      email,
      password: hashedPassword,
      role,
      parent_id: role === "child" ? (parent_id ?? null) : null,
      first_name,
      last_name,
      display_name,               // include unconditionally; NOT NULL in schema
      // include other NOT NULL columns here if your schema has them
      // e.g., created_at: new Date(),
    };

    const inserted = (await db
      .insert(users)
      .values(toInsert)
      .returning()) as Array<typeof users.$inferSelect>;

    const createdUser = inserted[0];
    if (!createdUser) {
      logger.error("Failed to insert user during registration.");
      return res.status(500).json({ message: "Internal server error" });
    }

    const token = signAuthToken({ id: createdUser.id, role: createdUser.role });
    res.cookie("access_token", token, COOKIE_OPTS);
    res.clearCookie("token");

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

/** Helper: run a simple per-child query and merge results */
async function selectLatestScreenTimeForChild(childId: number) {
  // Adjust table/column names as they exist in your DB
  const result = await db.execute<{
    used: number;
    allowed: number;
  }>(/* sql */ `
    SELECT used_time_minutes AS used, allowed_time_minutes AS allowed
    FROM screen_time
    WHERE user_id = ${childId}
    ORDER BY updated_at DESC
    LIMIT 1
  ` as any);
  return result.rows?.[0] ?? null;
}

async function selectRecentActivityForChild(childId: number, limit = 15) {
  const result = await db.execute<any>(/* sql */ `
    SELECT id, child_id, activity_type, activity_name, platform, duration_minutes,
           content_category, content_rating, flagged, flag_reason, timestamp
    FROM child_activity_logs
    WHERE child_id = ${childId}
    ORDER BY flagged DESC, timestamp DESC
    LIMIT ${limit}
  ` as any);
  return result.rows ?? [];
}

async function selectRecentContentAnalysisForChild(childId: number, limit = 15) {
  const result = await db.execute<any>(/* sql */ `
    SELECT id, child_id, content_name, content_type, platform, safety_score,
           parent_guidance_needed, reviewed_by_parent, created_at
    FROM content_analysis
    WHERE child_id = ${childId}
    ORDER BY parent_guidance_needed DESC, created_at DESC
    LIMIT ${limit}
  ` as any);
  return result.rows ?? [];
}

/** ─────────────────────────────────────────────────────────
 * GET /api/user (aka getMe) - returns enriched dashboard data
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
    const children = childRows.filter((c) => c.role === "child").map(safeUser);

    // --- Additional dashboard aggregates (parent only) ---
    let parentScreenTime: { used: number; allowed: number } | null = null;
    let childrenScreenTime: Array<{ childId: number; username: string; allowed: number; used: number }> = [];
    let recentActivityLogs: any[] = [];
    let recentContentAnalysis: any[] = [];
    let latestWeeklySummary: any = null;

    if (found.role === "parent") {
      // Latest parent screen time
      const parentSt = await db.execute<{ used: number; allowed: number }>(/* sql */ `
        SELECT used_time_minutes AS used, allowed_time_minutes AS allowed
        FROM screen_time
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
        LIMIT 1
      ` as any);
      if (Array.isArray(parentSt.rows) && parentSt.rows[0]) parentScreenTime = parentSt.rows[0];

      // Per-child screen time (latest row for each)
      if (children.length) {
        const promises = children.map(async (c) => {
          const st = await selectLatestScreenTimeForChild(c.id);
          if (st) {
            return { childId: c.id, username: c.username, allowed: st.allowed, used: st.used };
          }
          return { childId: c.id, username: c.username, allowed: 0, used: 0 };
        });
        childrenScreenTime = await Promise.all(promises);
      }

      // Per-child recent activity logs (merge + trim)
      if (children.length) {
        const actLists = await Promise.all(children.map((c) => selectRecentActivityForChild(c.id, 5)));
        recentActivityLogs = actLists.flat().sort((a, b) => Number(b.flagged) - Number(a.flagged) || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 15);
      }

      // Per-child recent content analysis (merge + trim)
      if (children.length) {
        const caLists = await Promise.all(children.map((c) => selectRecentContentAnalysisForChild(c.id, 5)));
        recentContentAnalysis = caLists.flat().sort((a, b) => Number(b.parent_guidance_needed) - Number(a.parent_guidance_needed) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);
      }

      // Latest weekly summary (example: family_id = userId)
      const ws = await db.execute<any>(/* sql */ `
        SELECT id, week_start_date, week_end_date, summary_content, parental_advice,
               discussion_topics, spiritual_guidance, generated_at
        FROM weekly_content_summaries
        WHERE family_id = ${userId}
        ORDER BY generated_at DESC
        LIMIT 1
      ` as any);
      if (Array.isArray(ws.rows) && ws.rows[0]) {
        latestWeeklySummary = ws.rows[0];
      }
    }

    // --- Verse of the Day (background cached) ---
    let verseOfDay:
      | { reference: string; verseText: string; verse?: string; reflection?: string; prayer?: string }
      | null = null;
    let isVerseGenerating = false;

    if (found.role === "parent" && process.env.RUNPOD_API_KEY) {
      const todayKey = new Date().toISOString().slice(0, 10);
      let [row] = await db
        .select()
        .from(dailyVerses)
        .where(eq(dailyVerses.date, todayKey))
        .limit(1);
      if (!row) {
        startDailyVerseGeneration(todayKey, userId);
        isVerseGenerating = true;
      } else {
        verseOfDay = {
          reference: row.reference,
          verseText: row.verseText,
          verse: row.verseText,
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
      childrenCount: children.length,
      verseOfDay,
      isVerseGenerating,
      parentScreenTime,
      childrenScreenTime,
      recentActivityLogs,
      recentContentAnalysis,
      latestWeeklySummary,
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
  ]).finally(() => clearTimeout(timer!));
}
