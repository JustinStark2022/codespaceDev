// src/controllers/lessons.controller.ts
import { Request, Response } from "express";
import { db } from "../db/db";
import { lessons, lesson_progress, users } from "../db/schema";
import { eq, and } from "drizzle-orm";

export const getBibleLessons = async (_req: Request, res: Response) => {
  const allLessons = db.select().from(lessons);
  res.json(allLessons);
};

export const getUserLessonProgress = async (req: Request & { user?: any }, res: Response) => {
  const result = db
    .select()
    .from(lesson_progress)
    .where(eq(lesson_progress.user_id, req.user.id));
  res.json(result);
};

export const updateLessonProgress = async (req: Request & { user?: any }, res: Response) => {
  const { lessonId, completed } = req.body;

  db.insert(lesson_progress).values({
    user_id: req.user.id,
    lesson_id: lessonId,
    completed,
  });

  res.status(200).json({ message: "Lesson updated" });
};

// Complete a lesson - new endpoint for frontend compatibility
export const completeLessonProgress = async (req: Request & { user?: any }, res: Response) => {
  const { lessonId, userId } = req.body;
  const targetUserId = userId || req.user.id;

  try {
    // Check if progress already exists
    const existing = await db
      .select()
      .from(lesson_progress)
      .where(
        and(
          eq(lesson_progress.user_id, targetUserId),
          eq(lesson_progress.lesson_id, lessonId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing progress
      await db
        .update(lesson_progress)
        .set({
          completed: true,
          completed_at: new Date()
        })
        .where(
          and(
            eq(lesson_progress.user_id, targetUserId),
            eq(lesson_progress.lesson_id, lessonId)
          )
        );
    } else {
      // Create new progress entry
      db.insert(lesson_progress).values({
        user_id: targetUserId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date()
      });
    }

    res.status(200).json({ message: "Lesson completed successfully" });
  } catch (error) {
    console.error("Error completing lesson:", error);
    res.status(500).json({ message: "Failed to complete lesson" });
  }
};

export const getUserLessonsWithProgress = async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Fetch all lessons
  const allLessons: Lesson[] = await db.select().from(lessons);

  // Fetch the user's progress
  const userProgress: LessonProgressEntry[] = db
    .select()
    .from(lesson_progress)
    .where(eq(lesson_progress.user_id, userId));

  // Map progress entries to a dictionary
  const progressMap = new Map<number, boolean>();
  interface LessonProgressEntry {
    lesson_id: number;
    completed: boolean;
    [key: string]: any; // For any additional fields
  }

  userProgress.forEach((entry: LessonProgressEntry) => {
    progressMap.set(entry.lesson_id, entry.completed);
  });

  // Combine lesson data with user progress
  interface Lesson {
    id: number;
    [key: string]: any; // For any additional lesson fields
  }

  interface LessonWithProgress {
    lesson: Lesson;
    completed: boolean;
  }

  const lessonProgress: LessonWithProgress[] = allLessons.map((lesson: Lesson) => ({
    lesson,
    completed: progressMap.get(lesson.id) || false,
  }));

  res.json(lessonProgress);
};

// Assign a lesson to a child (parent only)
export const assignLessonToChild = async (req: Request & { user?: { id: number } }, res: Response) => {
  const parentId = req.user?.id;
  const { lessonId } = req.params;
  const { childId } = req.body;

  if (!parentId || !lessonId || !childId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Check that the child belongs to the parent
    const child = await db
      .select()
      .from(users)
      .where(and(eq(users.id, childId), eq(users.parent_id, parentId)))
      .limit(1);

    if (child.length === 0) {
      return res.status(403).json({ message: "You do not have permission to assign lessons to this child." });
    }

    // Check if the lesson is already assigned
    const existing = await db
      .select()
      .from(lesson_progress)
      .where(and(eq(lesson_progress.user_id, childId), eq(lesson_progress.lesson_id, Number(lessonId))))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ message: "Lesson already assigned to this child." });
    }

    // Assign the lesson
    db.insert(lesson_progress).values({
      user_id: childId,
      lesson_id: Number(lessonId),
      completed: false,
    });

    res.status(201).json({ message: "Lesson assigned to child." });
  } catch (error) {
    console.error("Error assigning lesson:", error);
    res.status(500).json({ message: "Failed to assign lesson." });
  }
};

