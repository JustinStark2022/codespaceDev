// src/controllers/dashboard.controller.ts
import { Request, Response } from "express";
import { db } from "@/db/db";
import {
  users,
  lesson_progress,
  screen_time,
  content_analysis,
  llm_generated_content,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { llmService } from "@/services/llm.service";
import logger from "@/utils/logger";

export const getDashboard = async (req: Request & { user?: { id: number } }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  // Parent + children
  const [parent] = await db.select().from(users).where(eq(users.id, userId));
  const children = await db.select().from(users).where(eq(users.parent_id, userId));

  // Child metrics
  const kids = await Promise.all(
    children.map(async (c) => {
      const [st] = await db.select().from(screen_time).where(eq(screen_time.user_id, c.id)).limit(1);
      const progress = await db.select().from(lesson_progress).where(eq(lesson_progress.user_id, c.id));
      const done = progress.filter((p) => p.completed).length;
      return {
        id: c.id,
        name: c.display_name || c.username,
        status: "Online",
        screenTime: { used: st?.used_time_minutes ?? 0, allowed: st?.allowed_time_minutes ?? 120 },
        totalLessons: progress.length,
        completedLessons: done,
      };
    })
  );

  // Alerts: from flagged/low safety items
  const analysis = await db.select().from(content_analysis);
  const recentAlerts = analysis
    .filter((a) => (a.safety_score ?? 50) < 50)
    .slice(0, 10)
    .map((a) => ({
      title: a.content_name,
      category: a.content_type,
      reason: (a.ai_analysis || "").slice(0, 120),
      severity: (a.safety_score ?? 50) < 30 ? "high" : "medium",
    }));

  // Verse of the day (strict JSON)
  const verseSchema = `Return JSON with keys: reference (string), verseText (string), reflection (string), prayer (string).`;
  const verse = await llmService.generateStrictJSON<{ reference: string; verseText: string; reflection: string; prayer: string }>(
    verseSchema,
    `Provide a family-friendly Bible Verse of the Day (ESV or NIV) plus a short reflection and a one-sentence prayer.`
  );

  // Family summary
  const sumSchema = `Return JSON: { "bullets": [string, string, string] }`;
  const summary = await llmService.generateStrictJSON<{ bullets: string[] }>(
    sumSchema,
    `Give three short, practical family discipleship recommendations for today (parents with elementary-aged kids).`
  );

  // Cache raw texts (optional)
  try {
    await db.insert(llm_generated_content).values({
      content_type: "verse_of_day",
      prompt: "Verse of the Day",
      system_prompt: "Strict JSON",
      generated_content: JSON.stringify(verse),
      user_id: userId,
      context: "dashboard",
      reviewed: false,
      approved: true,
    });
    await db.insert(llm_generated_content).values({
      content_type: "family_summary",
      prompt: "Family Summary",
      system_prompt: "Strict JSON",
      generated_content: JSON.stringify(summary),
      user_id: userId,
      context: "dashboard",
      reviewed: false,
      approved: true,
    });
  } catch (e) {
    logger.warn("Skipping cache insert", e as any);
  }

  res.json({
    user: { id: parent.id, displayName: parent.display_name, role: parent.role },
    children: kids,
    recentAlerts,
    verseOfDay: verse,
    familySummary: summary,
    lastUpdated: new Date().toISOString(),
  });
};