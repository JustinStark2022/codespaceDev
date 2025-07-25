import { Request, Response } from "express";
import { callLLMWithRetry } from "../utils/llm";
import { db } from "../db/db";
import { content_monitoring } from "../db/schema";
import logger from "../utils/logger";

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

    const prompt = `You are a Christian parental guidance AI assistant specializing in content safety for children.

Analyze this ${contentType || 'content'} for potential concerns:

"${content}"

Provide a JSON response with:
{
  "safetyLevel": "SAFE" | "CAUTION" | "UNSAFE",
  "concerns": ["list of specific concerns if any"],
  "reasoning": "brief explanation of your assessment",
  "ageAppropriate": "recommended minimum age or 'all ages'",
  "parentalGuidance": "specific advice for parents",
  "biblicalPerspective": "relevant Christian values or biblical principles",
  "discussionPoints": ["suggestions for family conversations if needed"]
}

Consider these Christian family values:
- Biblical morality and ethics
- Age-appropriate content
- Language and behavior standards
- Spiritual and emotional well-being
- Protection from harmful influences

Be thorough but balanced - not everything needs to be flagged, but genuine concerns should be clearly identified.`;

    const analysis = await callLLMWithRetry(prompt);

    // Parse the JSON response
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysis);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      parsedAnalysis = {
        safetyLevel: analysis.toLowerCase().includes('unsafe') ? 'UNSAFE' : 
                    analysis.toLowerCase().includes('caution') ? 'CAUTION' : 'SAFE',
        reasoning: analysis,
        concerns: [],
        parentalGuidance: "Please review this content with your child.",
        biblicalPerspective: "Encourage discernment and biblical values.",
        discussionPoints: []
      };
    }

    // Log the monitoring event
    if (contentType && source) {
      await db.insert(content_monitoring).values({
        user_id: childId || userId,
        parent_id: userId,
        content_type: contentType,
        content_source: source,
        content_snippet: content.substring(0, 500),
        analysis_result: JSON.stringify(parsedAnalysis),
        safety_level: parsedAnalysis.safetyLevel,
        flagged: parsedAnalysis.safetyLevel !== 'SAFE'
      });
    }

    logger.info('Content analyzed', { 
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
    logger.error('Error analyzing content', { error: error.message, userId: req.user?.id });
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

    // Get monitoring data for the week
    const monitoringData = await db
      .select()
      .from(content_monitoring)
      .where(eq(content_monitoring.user_id, childId || userId))
      .orderBy(desc(content_monitoring.created_at))
      .limit(50);

    const contentSummary = monitoringData.map(item => 
      `${item.content_type}: ${item.content_snippet} (${item.safety_level})`
    ).join('\n');

    const prompt = `You are a Christian parenting coach providing a weekly family digital wellness summary.

Based on this week's monitored content activity:
${contentSummary}

Create a comprehensive weekly summary with:

**WEEK OVERVIEW**
- General assessment of the child's digital consumption
- Positive highlights and areas of growth
- Any patterns or trends noticed

**SAFETY ASSESSMENT**
- Summary of flagged vs safe content
- Specific concerns that need attention
- Areas where the child showed good discernment

**PARENTAL GUIDANCE**
- Specific conversation starters for the family
- Recommended family activities or discussions
- Suggested boundaries or guidelines to consider

**BIBLICAL WISDOM**
- Relevant scripture verses for family reflection
- Christian principles to discuss with your child
- Prayer points for your family's digital wellness

**ACTION STEPS**
- 3-5 concrete steps parents can take this week
- Age-appropriate ways to involve the child in the conversation
- Resources or activities to support digital discipleship

**ENCOURAGEMENT**
- Positive affirmations for parents
- Reminders of God's grace in parenting
- Celebration of progress made

Keep the tone encouraging, practical, and rooted in Christian values. Focus on building trust and open communication rather than fear or control.`;

    const summary = await callLLMWithRetry(prompt);

    logger.info('Weekly summary generated', { userId, childId });
    res.json({
      summary,
      weekPeriod: { start: weekStart, end: weekEnd },
      generatedAt: new Date().toISOString(),
      totalItemsAnalyzed: monitoringData.length
    });

  } catch (error: any) {
    logger.error('Error generating weekly summary', { error: error.message, userId: req.user?.id });
    res.status(500).json({ 
      error: "Failed to generate weekly summary",
      message: "Please try again later"
    });
  }
}
