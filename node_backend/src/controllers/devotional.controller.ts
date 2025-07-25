import { Request, Response } from "express";
import { callLLMWithRetry } from "../utils/llm";
import logger from "../utils/logger";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export async function generateDailyDevotional(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const prompt = `You are a warm, encouraging Christian devotional writer creating content for families with children. 

Create a daily devotional for ${today} that includes:

1. **Title**: A compelling, hope-filled title
2. **Bible Verse**: Include the full verse text and reference
3. **Reflection**: 2-3 short paragraphs that:
   - Explain the verse in family-friendly language
   - Include a practical life application
   - Connect to everyday family experiences
4. **Family Discussion**: 2-3 questions families can discuss together
5. **Prayer**: A simple, heartfelt prayer families can pray together
6. **Action Step**: One specific thing the family can do today to live out this lesson

Keep the tone warm, encouraging, and accessible for families with children ages 5-15. Focus on practical faith that can be lived out in daily life.`;

    const devotional = await callLLMWithRetry(prompt);

    logger.info('Daily devotional generated', { userId });
    res.json({ 
      devotional,
      date: today,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Error generating daily devotional', { error: error.message, userId: req.user?.id });
    res.status(500).json({ 
      error: "Failed to generate devotional",
      message: "Please try again later"
    });
  }
}

export async function getVerseOfTheDay(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const prompt = `You are a Christian ministry assistant. Generate a "Verse of the Day" for families.

Provide:
1. **Bible Verse**: A meaningful, encouraging verse (include full text and reference)
2. **Simple Explanation**: One sentence explaining what this verse means for families
3. **Daily Encouragement**: A short, uplifting message (2-3 sentences) about how this verse can guide families today
4. **Memory Tip**: A simple way families can remember or apply this verse

Choose verses that offer hope, guidance, love, or strength. Make it accessible for both parents and children.`;

    const verse = await callLLMWithRetry(prompt);

    logger.info('Verse of the day generated', { userId });
    res.json({ 
      verse,
      date: new Date().toLocaleDateString(),
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Error generating verse of the day', { error: error.message, userId: req.user?.id });
    res.status(500).json({ 
      error: "Failed to generate verse",
      message: "Please try again later"
    });
  }
}
