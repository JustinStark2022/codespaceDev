// node_backend/src/controllers/lessons.controller.ts
import type { Request, Response } from "express";
import { desc, eq, ilike } from "drizzle-orm";
import { db } from "../db/db";
import { lessons } from "../db/schema";

// Strongly-typed row
type Lesson = typeof lessons.$inferSelect;

/**
 * GET /api/lessons?limit=20
 */
export async function getRecentLessons(req: Request, res: Response) {
  try {
    const limit = Number(req.query.limit ?? 20) || 20;

    const rows: Lesson[] = await db
      .select()
      .from(lessons)
      // Change to your real timestamp column if needed (created_at vs createdAt)
      .orderBy(desc((lessons as any).createdAt ?? (lessons as any).created_at))
      .limit(limit);

    return res.json(rows);
  } catch (err) {
    console.error("getRecentLessons failed:", err);
    return res.status(500).json({ message: "Failed to fetch lessons." });
  }
}

/**
 * GET /api/lessons/:id
 */
export async function getLessonById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid id." });

    const rows: Lesson[] = await db
      .select()
      .from(lessons)
      .where(eq((lessons as any).id, id))
      .limit(1);

    const lesson = rows[0];
    if (!lesson) return res.status(404).json({ message: "Lesson not found." });

    return res.json(lesson);
  } catch (err) {
    console.error("getLessonById failed:", err);
    return res.status(500).json({ message: "Failed to fetch lesson." });
  }
}

/**
 * GET /api/lessons/search?q=term&limit=10
 */
export async function searchLessons(req: Request, res: Response) {
  try {
    const q = String(req.query.q ?? "").trim();
    const limit = Number(req.query.limit ?? 10) || 10;

    if (!q) return res.json([]);

    const rows: Lesson[] = await db
      .select()
      .from(lessons)
      .where(ilike((lessons as any).title, `%${q}%`))
      .orderBy(desc((lessons as any).createdAt ?? (lessons as any).created_at))
      .limit(limit);

    const results = rows.map((l) => ({
      id: (l as any).id,
      title: (l as any).title,
      // createdAt: (l as any).createdAt ?? (l as any).created_at, // add back once confirmed
      // summary: (l as any).summary,                              // add back once confirmed
    }));

    return res.json(results);
  } catch (err) {
    console.error("searchLessons failed:", err);
    return res.status(500).json({ message: "Failed to search lessons." });
  }
}

export default {
  getRecentLessons,
  getLessonById,
  searchLessons,
};
