// src/controllers/content.controller.ts
import { Request, Response } from "express";
import { callLLMWithRetry } from "../utils/llm";
import { db } from "../db/db";
// Update the import to match the actual exported member from schema, e.g.:
// If ContentMonitoring is the default export:
import ContentMonitoring from "../db/schema";
// Or, if the export is named differently, e.g. 'contentMonitoring':
// import { contentMonitoring as ContentMonitoring } from "../db/schema";
// Or, if the table is exported as default:
// import ContentMonitoring from "../db/schema";
import logger from "../utils/logger";
import { eq, desc } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export async function analyzeContent(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { content, contentType, childId, source } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!content) {
      return res.status(400).json({ error: "Content is required for analysis" });
    }

    const prompt = `You are a Christian parental guidance AI assistant specializing in content safety for children.\n\nAnalyze this ${contentType || 'content'} for potential concerns:\n\n"${content}"\n\nProvide a JSON response with:\n{\n  "safetyLevel": "SAFE" | "CAUTION" | "UNSAFE",\n  "concerns": ["list of specific concerns if any"],\n  "reasoning": "brief explanation of your assessment",\n  "ageAppropriate": "recommended minimum age or 'all ages'",\n  "parentalGuidance": "specific advice for parents",\n  "biblicalPerspective": "relevant Christian values or biblical principles",\n  "discussionPoints": ["suggestions for family conversations if needed"]\n}\n\nConsider these Christian family values:\n- Biblical morality and ethics\n- Age-appropriate content\n- Language and behavior standards\n- Spiritual and emotional well-being\n- Protection from harmful influences\n\nBe thorough but balanced.`;

    const analysis = await callLLMWithRetry(prompt);

    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysis);
    } catch {
      parsedAnalysis = {
        safetyLevel: analysis.toLowerCase().includes('unsafe') ? 'UNSAFE' :
                     analysis.toLowerCase().includes('caution') ? 'CAUTION' : 'SAFE',
        reasoning: analysis,
        concerns: [],
        parentalGuidance: "Please review this content with your child.",
        biblicalPerspective: "Encourage discernment grounded in biblical values.",
        discussionPoints: []
      };
    }

    if (contentType && source) {
      await db.insert(ContentMonitoring).values({
        user_id: childId || userId,
        parent_id: userId,
        content_type: contentType,
        content_source: source,
        content_snippet: content.substring(0, 500),
        analysis_result: JSON.stringify(parsedAnalysis),
        safety_level: parsedAnalysis.safetyLevel,
        flagged: parsedAnalysis.safetyLevel !== "SAFE",
        created_at: new Date()
      });
    }

    logger.info("Content analyzed", {
      userId,
      childId,
      safetyLevel: parsedAnalysis.safetyLevel,
      contentType
    });

    res.json({
      analysis: parsedAnalysis,
      analyzedAt: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error("Error analyzing content", {
      error: error.message,
      userId: req.user?.id
    });
    res.status(500).json({
      error: "Failed to analyze content",
      message: "Please try again later"
    });
  }
}

export async function generateWeeklySummary(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { childId, weekStart, weekEnd } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    type ContentMonitoringRow = {
      content_type: string;
      content_snippet: string;
      safety_level: string;
      // add other fields if needed
    };

    const rows: ContentMonitoringRow[] = await db
      .select()
      .from(ContentMonitoring)
      .where(eq(ContentMonitoring.user_id, childId || userId))
      .orderBy(desc(ContentMonitoring.created_at))
      .limit(50);

    const contentSummary = rows.map(item =>
      `${item.content_type}: ${item.content_snippet} (${item.safety_level})`
    ).join("\n");

    const prompt = `You are a Christian parenting coach providing a weekly family digital wellness summary.\n\nBased on this week's monitored content activity:\n${contentSummary}\n\nCreate a comprehensive weekly summary with:\n\nWEEK OVERVIEW\n- General assessment of the child's digital consumption\n- Positive highlights and areas of growth\n- Any noticed trends or patterns\n\nSAFETY ASSESSMENT\n- Summary of flagged vs safe content\n- Key concerns that need attention\n- Examples of good discernment\n\nPARENTAL GUIDANCE\n- Conversation starters for the family\n- Suggested boundaries or guidelines\n- Ideas for digital discipleship activities\n\nBIBLICAL WISDOM\n- Relevant scripture verses\n- Christian principles for discussion\n- Prayer points for reflection\n\nACTION STEPS\n- 3–5 concrete steps parents can take\n- Age‑appropriate ways to involve children\n- Recommended resources or activities\n\nENCOURAGEMENT\n- Affirmations for parents\n- Reminders of God’s grace in parenting\n- Celebrating progress made`;

    const summaryText = await callLLMWithRetry(prompt);

    logger.info("Weekly summary generated", { userId, childId });

    res.json({
      summary: summaryText,
      weekPeriod: { start: weekStart, end: weekEnd },
      generatedAt: new Date().toISOString(),
      totalItemsAnalyzed: rows.length
    });
  } catch (error: any) {
    logger.error("Error generating weekly summary", {
      error: error.message,
      userId: req.user?.id
    });
    res.status(500).json({
      error: "Failed to generate weekly summary",
      message: "Please try again later"
    });
  }
}
