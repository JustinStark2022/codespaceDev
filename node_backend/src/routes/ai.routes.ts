// src/routes/ai.routes.ts
import express, { Request, Response, NextFunction } from "express";
import { llmService } from "../services/llm.service";
import logger from "../utils/logger";
import { verifyToken } from "../middleware/auth.middleware";
import { db } from "../db/db";
import {
  users,
  child_activity_logs,
  content_analysis,
  weekly_content_summaries,
} from "../db/schema";
import { eq, desc } from "drizzle-orm";

const router = express.Router();

interface AuthenticatedRequest extends Request {
  user?: { id: number; role: string };
}

const asyncHandler =
  <T extends Request, U extends Response>(fn: (req: T, res: U, next: NextFunction) => Promise<any>) =>
  (req: T, res: U, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/* -------------------- DASHBOARD AGGREGATE -------------------- */
// GET /api/ai/dashboard
router.get(
  "/dashboard",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id!;
    // children
    const kids = await db.select().from(users).where(eq(users.parent_id, userId));

    // recent alerts (toy example from content_analysis)
    const alerts = await db
      .select()
      .from(content_analysis)
      .where(eq(content_analysis.child_id, kids[0]?.id ?? 0))
      .orderBy(desc(content_analysis.created_at))
      .limit(10);

    // verse + summary (LLM) – both are resilient
    let verseOfDay: any = null;
    let familySummary: { bullets?: string[] } | null = null;

    try {
      verseOfDay = await llmService.generateVerseOfTheDay();
    } catch (e) {
      logger.warn("Verse generation failed; continuing:", e);
    }

    try {
      // lightweight “summary”; replace with real prompt later if desired
      familySummary = {
        bullets: [
          "Daily Bible Time: Encourage each child to read at least 10 minutes.",
          "Family Devotions: Set aside a weekly discussion.",
          "Serve Others: Find a simple way to help someone together.",
        ],
      };
    } catch (e) {
      familySummary = null;
    }

    return res.json({
      verseOfDay,
      familySummary,
      children: kids.map((k) => ({
        id: k.id,
        name: k.display_name || k.username,
        profilePicture: null,
      })),
      recentAlerts: alerts.map((a) => ({
        id: a.id,
        name: a.content_name,
        flagReason: a.guidance_notes ?? "Reviewed",
      })),
      canGenerateWeeklyReport: false, // set logic when you’re ready
    });
  })
);

/* -------------------- CONTENT SCAN -------------------- */
router.post(
  "/content-scan",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { content, type, contentName, platform, childId } = req.body as {
      content?: string;
      type?: string;
      contentName?: string;
      platform?: string;
      childId?: number;
    };

    if (!content) return res.status(400).json({ error: "Content is required" });

    const systemPrompt =
      "You are a Christian content safety analyzer. Reply JSON with keys: flagged (boolean), safetyScore (0-100), categories (string[]), reason (string), parentGuidanceNeeded (boolean), recommendedAge (string), guidanceNotes (string).";

    const prompt = `Analyze this ${type || "content"}:
Name: ${contentName || "Unknown"}
Platform: ${platform || "Unknown"}
Text:
${content}`;

    const raw = await llmService.generateContentScan(prompt, systemPrompt, req.user?.id, childId, "content_scan");

    let analysis: {
      flagged: boolean;
      safetyScore: number;
      categories: string[];
      reason: string;
      parentGuidanceNeeded: boolean;
      recommendedAge: string;
      guidanceNotes: string;
      confidence?: number;
    };

    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      analysis = {
        flagged: !!parsed.flagged,
        safetyScore: Number(parsed.safetyScore ?? 70),
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        reason: String(parsed.reason ?? "Analysis complete."),
        parentGuidanceNeeded: !!parsed.parentGuidanceNeeded,
        recommendedAge: String(parsed.recommendedAge ?? "All ages"),
        guidanceNotes: String(parsed.guidanceNotes ?? "Review together."),
        confidence: Number(parsed.confidence ?? 0.8),
      };
    } catch {
      const flagged = /inappropriate|violence|adult|explicit|gambling|occult/i.test(String(raw));
      analysis = {
        flagged,
        safetyScore: flagged ? 35 : 85,
        categories: [],
        reason: typeof raw === "string" ? raw.slice(0, 500) : "LLM response",
        parentGuidanceNeeded: flagged,
        recommendedAge: "All ages",
        guidanceNotes: "Review together.",
        confidence: 0.7,
      };
    }

    if (childId && contentName) {
      try {
        await db.insert(content_analysis).values({
          child_id: childId,
          content_name: contentName,
          content_type: type || "unknown",
          platform: platform || null,
          ai_analysis: JSON.stringify(analysis),
          safety_score: analysis.safetyScore,
          content_themes: JSON.stringify(analysis.categories),
          recommended_age: analysis.recommendedAge,
          parent_guidance_needed: analysis.parentGuidanceNeeded,
          guidance_notes: analysis.guidanceNotes,
          approved: !analysis.flagged,
        });
      } catch (err) {
        logger.warn("Content analysis save failed:", err);
      }
    }

    return res.json({ id: Date.now(), ...analysis, scanTime: new Date().toISOString() });
  })
);

/* -------------------- CHAT -------------------- */
router.post(
  "/chat",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { message, context } = req.body as { message?: string; context?: string };
    if (!message) return res.status(400).json({ error: "Message is required" });

    try {
      const responseText = await llmService.generateChatResponse(message, context, req.user?.id);
      return res.json({ response: responseText, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error("generateChat error:", err);
      return res.status(200).json({
        response: "I'm having trouble connecting right now. Please try again later.",
      });
    }
  })
);

/* -------------------- VERSE OF THE DAY -------------------- */
router.get(
  "/verse-of-the-day",
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const verse = await llmService.generateVerseOfTheDay();
      return res.json({ ...verse, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error("generateVerse error:", err);
      return res.status(500).json({ error: "Failed to generate verse" });
    }
  })
);

/* -------------------- DEVOTIONAL -------------------- */
router.get(
  "/devotional",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const topic = typeof req.query.topic === "string" ? req.query.topic : undefined;
      const devotional = await llmService.generateDevotional(topic);
      return res.json({ ...devotional, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error("generateDevotional error:", err);
      return res.status(500).json({ error: "Failed to generate devotional" });
    }
  })
);

/* -------------------- GENERATE LESSON -------------------- */
router.post(
  "/generate-lesson",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { topic, ageGroup, duration, childId, difficulty } = req.body as {
      topic?: string;
      ageGroup?: string;
      duration?: number;
      childId?: number;
      difficulty?: string;
    };
    if (!topic) return res.status(400).json({ error: "Topic is required" });

    const childContext = childId ? await llmService.fetchChildContext(childId) : "";

    try {
      const lesson = await llmService.generateLesson(
        topic,
        ageGroup,
        duration,
        difficulty,
        req.user?.id,
        childId,
        childContext
      );
      return res.json(lesson);
    } catch (err) {
      logger.error("generateLesson error:", err);
      return res.status(500).json({ error: "Failed to generate lesson" });
    }
  })
);

export default router;
