
import express, { Request, Response, NextFunction } from "express";
import { llmService } from "../services/llm.service";
import logger from "../utils/logger";
import { verifyToken } from "../middleware/auth.middleware";
import {
  child_activity_logs,
  content_analysis,
  weekly_content_summaries,
} from "../db/schema";
import { db } from "../db/db";
import { eq, desc } from "drizzle-orm";

const router = express.Router();

/** Request augmented by auth middleware */
interface AuthenticatedRequest extends Request {
  user?: { id: number; role: string };
}

/** Async wrapper */
const asyncHandler =
  <T extends Request, U extends Response>(
    fn: (req: T, res: U, next: NextFunction) => Promise<any>
  ) =>
  (req: T, res: U, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/* =========================================================
   POST /api/ai/content-scan
   Analyze arbitrary content and persist a record (optional)
   ========================================================= */
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
      "You are a Christian content safety analyzer. Reply with concise JSON. Keys: flagged (boolean), safetyScore (0-100), categories (string[]), reason (string), parentGuidanceNeeded (boolean), recommendedAge (string), guidanceNotes (string).";

    const prompt = `Analyze this ${type || "content"} for safety and age-appropriateness.
Content Name: ${contentName || "Unknown"}
Platform: ${platform || "Unknown"}
Text:
${content}
`;

    // Call LLM
    const raw = await llmService.generateContentScan(
      prompt,
      systemPrompt,
      req.user?.id,
      childId,
      "content_scan"
    );

    // Try to parse JSON first; fallback to heuristic
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
        guidanceNotes: String(parsed.guidanceNotes ?? "Review with your child."),
        confidence: Number(parsed.confidence ?? 0.8),
      };
    } catch {
      const flagged = /inappropriate|violence|adult|explicit|gambling|occult/i.test(
        String(raw)
      );
      analysis = {
        flagged,
        safetyScore: flagged ? 35 : 85,
        categories: [],
        reason: typeof raw === "string" ? raw.slice(0, 500) : "LLM response",
        parentGuidanceNeeded: flagged,
        recommendedAge: "All ages",
        guidanceNotes: "Review content with your child.",
        confidence: 0.7,
      };
    }

    // Persist content_analysis row if we have identifiers
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

    return res.json({
      id: Date.now(),
      ...analysis,
      scanTime: new Date().toISOString(),
    });
  })
);

/* ===========================================
   POST /api/ai/chat
   =========================================== */
router.post(
  "/chat",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { message, context } = req.body as {
      message?: string;
      context?: string;
    };
    if (!message) return res.status(400).json({ error: "Message is required" });

    try {
      const responseText = await llmService.generateChatResponse(
        message,
        context,
        req.user?.id
      );
      return res.json({
        response: responseText,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("generateChat error:", err);
      return res.status(500).json({
        error: "AI error",
        response:
          "I'm having trouble connecting right now. Please try again later.",
      });
    }
  })
);

/* ===========================================
   GET /api/ai/verse-of-the-day
   =========================================== */
interface VerseOfTheDayResponse {
  verse: string;
  reference: string;
  translation?: string;
  explanation?: string;
  timestamp: string;
}

router.get(
  "/verse-of-the-day",
  asyncHandler(
    async (
      _req: Request,
      res: Response<VerseOfTheDayResponse | { error: string }>
    ) => {
      try {
        const verse = await llmService.generateVerseOfTheDay();
        return res.json({ ...verse, timestamp: new Date().toISOString() });
      } catch (err) {
        logger.error("generateVerse error:", err);
        return res.status(500).json({ error: "Failed to generate verse" });
      }
    }
  )
);

/* ===========================================
   GET /api/ai/devotional
   =========================================== */
router.get(
  "/devotional",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const topic =
        typeof req.query.topic === "string"
          ? (req.query.topic as string)
          : undefined;
      const devotional = await llmService.generateDevotional(topic);
      return res.json({ ...devotional, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error("generateDevotional error:", err);
      return res.status(500).json({ error: "Failed to generate devotional" });
    }
  })
);

/* ===========================================
   POST /api/ai/generate-lesson
   =========================================== */
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

    const childContext = childId
      ? await llmService.fetchChildContext(childId)
      : "";

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

/* ===========================================
   GET /api/ai/weekly-summary/:familyId
   =========================================== */
router.get(
  "/weekly-summary/:familyId",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const familyId = parseInt(req.params.familyId, 10);
    const userId = req.user?.id;
    if (!Number.isFinite(familyId)) {
      return res.status(400).json({ error: "Invalid familyId" });
    }
    if (familyId !== userId && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    try {
      const summary = await llmService.generateWeeklySummary({ familyId });
      return res.json({
        success: true,
        summary,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("generateWeeklySummary error:", err);
      return res
        .status(500)
        .json({ error: "Failed to generate weekly summary" });
    }
  })
);

/* ===========================================
   GET /api/ai/weekly-summaries
   =========================================== */
router.get(
  "/weekly-summaries",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const summaries = await db
        .select()
        .from(weekly_content_summaries)
        .where(eq(weekly_content_summaries.family_id, userId))
        .orderBy(desc(weekly_content_summaries.generated_at))
        .limit(10);

      return res.json({ success: true, summaries });
    } catch (err) {
      logger.warn("fetch weekly summaries failed:", err);
      return res.json({ success: true, summaries: [] });
    }
  })
);

/* ===========================================
   POST /api/ai/log-activity
   =========================================== */
router.post(
  "/log-activity",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      childId,
      activityType,
      activityName,
      platform,
      duration,
      contentCategory,
    } = req.body as {
      childId?: number;
      activityType?: string;
      activityName?: string;
      platform?: string;
      duration?: number;
      contentCategory?: string;
    };

    if (!childId || !activityType || !activityName) {
      return res.status(400).json({ error: "Missing fields" });
    }

    try {
      await db.insert(child_activity_logs).values({
        child_id: childId,
        activity_type: activityType,
        activity_name: activityName,
        platform: platform || null,
        duration_minutes: duration ?? null,
        content_category: contentCategory || null,
      });
      return res.json({ success: true });
    } catch (err) {
      logger.error("logActivity DB error:", err);
      return res.status(500).json({ error: "Failed to log activity" });
    }
  })
);

/* ===========================================
   POST /api/ai/generate
   Simple freestyle generation
   =========================================== */
router.post(
  "/generate",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    try {
      const responseText = await llmService.generateChatResponse(prompt);
      return res.json({ success: true, response: responseText });
    } catch (err) {
      logger.error("Error in /generate route:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  })
);

export default router;