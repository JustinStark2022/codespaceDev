// src/routes/aiRoutes.ts

import express, { Request, Response, NextFunction } from "express";
import { llmService } from "../services/llm.service";
import logger from "../utils/logger";
import { verifyToken } from "../middleware/auth";
import { db, child_activity_logs, content_analysis, weekly_content_summaries } from "../db/schema";
import { eq, desc, gte, lte } from "drizzle-orm";

const router = express.Router();

// Strongly typed request with optional user
interface AuthenticatedRequest extends Request {
  user?: { id: number; role: string };
}

// Async handler wrapper
const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Endpoint: POST /api/ai/content-scan
router.post(
  "/content-scan",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { content, type, contentName, platform, childId } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    const systemPrompt = `You are a Christian content safety analyzer... (concise)`;
    const prompt = `Analyze this ${type || "content"}: Content Name: ${contentName || "Unknown"}...`;

    // Direct service call
    const response = await llmService.generateContentScan(
      prompt,
      systemPrompt,
      req.user?.id,
      childId,
      "content_scan"
    );

    let analysis;
    try {
      analysis = typeof response === "string" ? JSON.parse(response) : response;
    } catch {
      const flagged = response.toLowerCase().includes("inappropriate");
      analysis = {
        flagged,
        confidence: 0.8,
        safetyScore: flagged ? 30 : 85,
        categories: [],
        reason: response,
        parentGuidanceNeeded: flagged,
        recommendedAge: "All ages",
        guidanceNotes: "Review content with your child."
      };
    }

    // Persist to DB if applicable
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

// Endpoint: POST /api/ai/chat
router.post(
  "/chat",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    try {
      const responseText = await llmService.generateChatResponse(message, context, req.user?.id);
      return res.json({ response: responseText, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error("generateChat error:", err);
      return res.status(500).json({
        error: "AI error",
        response: "I'm having trouble connecting right now. Please try again later."
      });
    }
  })
);

// GET /api/ai/verse-of-the-day
router.get(
  "/verse-of-the-day",
  asyncHandler(async (_req, res: Response) => {
    try {
      const verse = await llmService.generateVerseOfTheDay();
      return res.json({ ...verse, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error("generateVerse error:", err);
      return res.status(500).json({ error: "Failed to generate verse" });
    }
  })
);

// GET /api/ai/devotional
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

// POST /api/ai/generate-lesson
router.post(
  "/generate-lesson",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { topic, ageGroup, duration, childId, difficulty } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic is required" });

    // Pass child context if available
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

// GET /api/ai/weekly-summary/:familyId
router.get(
  "/weekly-summary/:familyId",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const familyId = parseInt(req.params.familyId, 10);
    const userId = req.user?.id;
    if (familyId !== userId && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    try {
      const summary = await llmService.generateWeeklySummary({ familyId });
      return res.json({ success: true, summary, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error("generateWeeklySummary error:", err);
      return res.status(500).json({ error: "Failed to generate weekly summary" });
    }
  })
);

// GET /api/ai/weekly-summaries
router.get(
  "/weekly-summaries",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const summaries = await db.select().from(weekly_content_summaries)
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

// POST /api/ai/log-activity
router.post(
  "/log-activity",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { childId, activityType, activityName, platform, duration, contentCategory } = req.body;
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

// POST /api/ai/generate
router.post(
  "/generate",
  verifyToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const prompt = req.body.prompt;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    try {
      const responseText = await llmService.generateChatResponse(prompt);
      return res.json({ success: true, response: responseText });
    } catch (err) {
      logger.error("Error in /generate route:", err);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  })
);

export default router;
