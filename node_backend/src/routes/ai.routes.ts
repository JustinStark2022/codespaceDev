// src/routes/ai.routes.ts
import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import {
  users,
  child_activity_logs,
  content_analysis,
  weekly_content_summaries,
} from "@/db/schema";
import { requireAuth } from "@/middleware/auth.middleware"; 
import { llmService } from "@/services/llm.service";
import logger from "@/utils/logger";

const router = Router();

type AuthedReq = Request & { user?: { id: number; role: string } };

const asyncHandler =
  <T extends Request, U extends Response>(fn: (req: T, res: U, next: NextFunction) => Promise<any>) =>
  (req: T, res: U, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/* GET /api/ai/dashboard */
router.get(
  "/dashboard",
  requireAuth,
  asyncHandler(async (req: AuthedReq, res: Response) => {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
    const parentId = req.user.id;

    const children = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.display_name,
        role: users.role,
        parentId: users.parent_id,
        firstName: users.first_name,
        lastName: users.last_name,
        createdAt: users.created_at,
      })
      .from(users)
      .where(and(eq(users.parent_id, parentId), eq(users.role, "child")));

    const recentAnalysis = await db
      .select()
      .from(content_analysis)
      .where(eq(content_analysis.reviewed_by_parent, false))
      .orderBy(desc(content_analysis.created_at))
      .limit(10);

    const recentActivityFlags = await db
      .select()
      .from(child_activity_logs)
      .where(eq(child_activity_logs.flagged, true))
      .orderBy(desc(child_activity_logs.timestamp))
      .limit(10);

    const recentAlerts = [
      ...recentAnalysis.map((r) => ({
        id: `ca-${r.id}`,
        name: r.content_name,
        type: r.content_type,
        flagReason: "AI analysis requested review",
      })),
      ...recentActivityFlags.map((r) => ({
        id: `al-${r.id}`,
        name: r.activity_name,
        type: r.activity_type,
        flagReason: r.flag_reason || "Flagged activity",
      })),
    ].slice(0, 12);

    let verseOfDay:
      | { reference: string; verseText: string; reflection: string; prayer?: string }
      | null = null;
    try {
      const v = await llmService.generateVerseOfTheDay();
      verseOfDay = {
        reference: v.reference,
        verseText: v.verse,
        reflection: v.reflection,
        prayer: "Lord, help us live this verse today. Amen.",
      };
    } catch (e) {
      logger.warn("Verse of the day failed; using fallback");
      // Optionally log a short preview when upstream parsing fails
      // logger.debug("VOTD parse error", e);
      verseOfDay = {
        reference: "Proverbs 3:5–6",
        verseText:
          "Trust in the Lord with all your heart and lean not on your own understanding.",
        reflection: "Invite God into your decisions today; His wisdom steadies your steps.",
        prayer: "Jesus, guide our family choices today. Amen.",
      };
    }

    let devotional: { title: string; content: string; prayer: string } | null = null;
    try {
      {
        const raw = await llmService.generateChatResponse(
          "Write a short family devotional for today with a hopeful, Scripture-centered tone (120–180 words).",
          "Return as plain text with sections labeled exactly:\nTitle:\nContent:\nPrayer:\nNo markdown, no bullets, no extra headers.",
          req.user?.id
        );

        const title =
          raw.match(/^\s*Title:\s*(.+)$/im)?.[1]?.trim() || "Walking in Faith";
        const content =
          raw.match(/^\s*Content:\s*([\s\S]*?)(?:\n\s*Prayer:|$)/im)?.[1]?.trim() ||
          raw.trim();
        const prayer =
          raw.match(/^\s*Prayer:\s*([\s\S]+)$/im)?.[1]?.trim() ||
          "Lord, lead our home in love and unity. Amen.";

        devotional = { title, content, prayer };
      }
    } catch {
      devotional = {
        title: "Walking in Faith",
        content:
          "God invites families to trust Him together. Read this aloud and discuss one way to show kindness today.",
        prayer: "Lord, lead our home in love and unity. Amen.",
      };
    }

    let familySummary: { bullets: string[] } | null = null;
    try {
      const text = await llmService.generateChatResponse(
        "Give 3 short, practical bullets for a Christian family to grow this week.",
        "Return as plain text with three bullet lines."
      );
      const bullets = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 3);
      familySummary = {
        bullets:
          bullets.length > 0
            ? bullets
            : [
                "Daily Bible Time: read a short passage together.",
                "Pray for one friend or neighbor.",
                "Serve others: choose one simple act this week.",
              ],
      };
    } catch {
      familySummary = {
        bullets: [
          "Daily Bible Time: read a short passage together.",
          "Pray for one friend or neighbor.",
          "Serve others: choose one simple act this week.",
        ],
      };
    }

    const lastWeekly = await db
      .select()
      .from(weekly_content_summaries)
      .where(eq(weekly_content_summaries.family_id, parentId))
      .orderBy(desc(weekly_content_summaries.generated_at))
      .limit(1);

    const weeklySummary = lastWeekly[0] ?? null;

    return res.json({
      verseOfDay,
      devotional,
      familySummary,
      weeklySummary,
      children,
      recentAlerts,
      timestamp: new Date().toISOString(),
    });
  })
);

/* POST /api/ai/chat */
router.post(
  "/chat",
  requireAuth,
  asyncHandler(async (req: AuthedReq, res: Response) => {
    const { message, context } = req.body as { message?: string; context?: string };
    if (!message) return res.status(400).json({ error: "Message is required" });
    try {
      const responseText = await llmService.generateChatResponse(
        message,
        context,
        req.user?.id
      );
      return res.json({ response: responseText, timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error("generateChatResponse error:", err);
      return res.json({
        response:
          "I’m having trouble connecting to the model right now. Please try again shortly.",
      });
    }
  })
);

/* GET /api/ai/verse-of-the-day */
router.get(
  "/verse-of-the-day",
  asyncHandler(async (_req, res) => {
    const v = await llmService.generateVerseOfTheDay();
    res.json({ ...v, timestamp: new Date().toISOString() });
  })
);

/* GET /api/ai/devotional */
router.get(
  "/devotional",
  asyncHandler(async (_req, res) => {
    try {
      const raw = await llmService.generateChatResponse(
        "Write a short family devotional for today with a hopeful, Scripture-centered tone (120–180 words).",
        "Return as plain text with sections labeled exactly:\nTitle:\nContent:\nPrayer:\nNo markdown, no bullets, no extra headers."
      );

      const title =
        raw.match(/^\s*Title:\s*(.+)$/im)?.[1]?.trim() || "Walking in Faith";
      const content =
        raw.match(/^\s*Content:\s*([\s\S]*?)(?:\n\s*Prayer:|$)/im)?.[1]?.trim() ||
        raw.trim();
      const prayer =
        raw.match(/^\s*Prayer:\s*([\s\S]+)$/im)?.[1]?.trim() ||
        "Lord, lead our home in love and unity. Amen.";

      res.json({ title, content, prayer, timestamp: new Date().toISOString() });
    } catch {
      res.json({
        title: "Walking in Faith",
        content:
          "God invites families to trust Him together. Read this aloud and discuss one way to show kindness today.",
        prayer: "Lord, lead our home in love and unity. Amen.",
        timestamp: new Date().toISOString(),
      });
    }
  })
);

export default router;
