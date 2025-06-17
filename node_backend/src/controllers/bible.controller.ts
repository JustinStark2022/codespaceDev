// src/controllers/bible.controller.ts
import { Request, Response } from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { db } from "@/db/db";
import { lessons, lesson_progress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import logger from "@/utils/logger";

dotenv.config();

const API_KEY = process.env.BIBLE_API_KEY!;
const BASE_URL = "https://api.scripture.api.bible/v1";
const headers = { "api-key": API_KEY };

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

// Mock Bible data for now
const mockBibleBooks = [
  { id: 1, name: "Genesis", testament: "Old" },
  { id: 2, name: "Exodus", testament: "Old" },
  { id: 3, name: "Matthew", testament: "New" },
  { id: 4, name: "Mark", testament: "New" },
  { id: 5, name: "Luke", testament: "New" },
  { id: 6, name: "John", testament: "New" }
];

const mockVerses = [
  {
    id: 1,
    book: "John",
    chapter: 3,
    verse: 16,
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."
  },
  {
    id: 2,
    book: "Psalm",
    chapter: 23,
    verse: 1,
    text: "The Lord is my shepherd, I lack nothing."
  },
  {
    id: 3,
    book: "Romans",
    chapter: 8,
    verse: 28,
    text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose."
  }
];

const mockLessons = [
  {
    id: 1,
    title: "God's Love for Us",
    verse_ref: "John 3:16",
    content: "This lesson teaches us about God's incredible love for all people. Through His Son Jesus, we can have eternal life.",
    age_range: "6-12",
    scripture_references: "John 3:16, Romans 5:8",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: "The Good Shepherd",
    verse_ref: "Psalm 23:1",
    content: "Jesus is our Good Shepherd who takes care of us and guides us through life.",
    age_range: "4-10",
    scripture_references: "Psalm 23:1-6, John 10:11",
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    title: "God Works for Good",
    verse_ref: "Romans 8:28",
    content: "Even when things seem difficult, God can use everything for good in our lives.",
    age_range: "8-14",
    scripture_references: "Romans 8:28, Jeremiah 29:11",
    created_at: new Date().toISOString()
  }
];

// Get all English Bible versions
export const getBibles = async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${BASE_URL}/bibles?language=eng`, { headers });
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json: any = await response.json();
    
    // Filter for popular English versions
    const preferredBibleIds = [
      "de4e12af7f28f599-02", // NIrV
      "fae1f5d81de52cbe-01", // NLT  
      "06125adad2d5898a-01", // ERV
      "9879dbb7cfe39e4d-01", // NIV
      "1d07b894f3e8f5f4-01", // CSB
      "f72b840c855f362c-04", // ESV
      "61fd76eafa1577c2-01", // NASB
    ];
    
    const bibles = json.data
      .filter((b: any) => preferredBibleIds.includes(b.id))
      .map((b: any) => ({
        id: b.id,
        abbreviation: b.abbreviation,
        name: b.name,
        description: b.description,
        language: b.language
      }));
      
    res.json({ data: bibles });
  } catch (err) {
    console.error("Bible API Error:", err);
    res.status(500).json({ message: "Failed to fetch Bibles", error: err });
  }
};

// Get books in a Bible
export const getBooks = async (req: Request, res: Response) => {
  const { bibleId } = req.params;
  if (!bibleId) {
    return res.status(400).json({ message: "Missing Bible ID" });
  }

  try {
    const response = await fetch(`${BASE_URL}/bibles/${bibleId}/books`, { headers });
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json: any = await response.json();
    
    const books = json.data.map((b: any) => ({
      id: b.id,
      bibleId: b.bibleId,
      abbreviation: b.abbreviation,
      name: b.name,
      nameLong: b.nameLong,
    }));
    
    res.json({ data: books });
  } catch (err) {
    console.error("Books API Error:", err);
    res.status(500).json({ message: "Failed to fetch books", error: err });
  }
};

// Get chapters in a book
export const getChapters = async (req: Request, res: Response) => {
  const { bibleId, bookId } = req.params;
  if (!bibleId || !bookId) {
    return res.status(400).json({ message: "Missing Bible ID or Book ID" });
  }

  try {
    const response = await fetch(`${BASE_URL}/bibles/${bibleId}/books/${bookId}/chapters`, { headers });
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json: any = await response.json();
    
    const chapters = json.data.map((c: any) => ({ 
      id: c.id, 
      bibleId: c.bibleId,
      bookId: c.bookId,
      number: c.number,
      reference: c.reference
    }));
    
    res.json({ data: chapters });
  } catch (err) {
    console.error("Chapters API Error:", err);
    res.status(500).json({ message: "Failed to fetch chapters", error: err });
  }
};

// Get a chapter's content
export const getChapterContent = async (req: Request, res: Response) => {
  const { bibleId, chapterId } = req.params;
  const contentType = req.query["content-type"] || "html";
  
  if (!bibleId || !chapterId) {
    return res.status(400).json({ message: "Missing Bible ID or Chapter ID" });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/bibles/${bibleId}/chapters/${chapterId}?content-type=${contentType}&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`, 
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json: any = await response.json();
    res.json(json.data);
  } catch (err) {
    console.error("Chapter Content API Error:", err);
    res.status(500).json({ message: "Failed to fetch chapter content", error: err });
  }
};

// Get verses in a chapter
export const getVerses = async (req: Request, res: Response) => {
  const { bibleId, chapterId } = req.params;
  if (!bibleId || !chapterId) {
    return res.status(400).json({ message: "Missing Bible ID or Chapter ID" });
  }

  try {
    const response = await fetch(`${BASE_URL}/bibles/${bibleId}/chapters/${chapterId}/verses`, { headers });
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json: any = await response.json();
    
    const verses = json.data.map((v: any) => ({
      id: v.id,
      orgId: v.orgId,
      bibleId: v.bibleId,
      bookId: v.bookId,
      chapterId: v.chapterId,
      reference: v.reference
    }));
    
    res.json({ data: verses });
  } catch (err) {
    console.error("Verses API Error:", err);
    res.status(500).json({ message: "Failed to fetch verses list", error: err });
  }
};

// Get a single verse
export const getVerse = async (req: Request, res: Response) => {
  const { bibleId, verseId } = req.params;
  const contentType = req.query["content-type"] || "html";
  
  if (!bibleId || !verseId) {
    return res.status(400).json({ message: "Missing Bible ID or Verse ID" });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/bibles/${bibleId}/verses/${verseId}?content-type=${contentType}&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`, 
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json: any = await response.json();
    res.json(json.data);
  } catch (err) {
    console.error("Verse API Error:", err);
    res.status(500).json({ message: "Failed to fetch verse", error: err });
  }
};

// Get a full passage (e.g., GEN.1 or GEN.1.1-5)
export const getBiblePassage = async (req: Request, res: Response) => {
  const { bibleId, passageId } = req.params;
  const contentType = req.query["content-type"] || "html";

  if (!bibleId || !passageId) {
    return res.status(400).json({ error: "Missing bibleId or passageId" });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/bibles/${bibleId}/passages/${passageId}?content-type=${contentType}&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false&parallel-passages=false`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json: any = await response.json();
    res.json(json);
  } catch (err) {
    console.error("Passage API Error:", err);
    res.status(500).json({ error: "Failed to fetch passage", details: err });
  }
};

// Search Bible text
export const searchBible = async (req: Request, res: Response) => {
  const { bibleId } = req.params;
  const { query, limit = 10, offset = 0 } = req.query;

  if (!bibleId || !query) {
    return res.status(400).json({ error: "Missing bibleId or search query" });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/bibles/${bibleId}/search?query=${encodeURIComponent(query as string)}&limit=${limit}&offset=${offset}&sort=relevance&range=`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}: ${response.statusText}`);
    }
    
    const json: any = await response.json();
    res.json(json);
  } catch (err) {
    console.error("Search API Error:", err);
    res.status(500).json({ error: "Failed to search Bible", details: err });
  }
};

export const getBibleBooks = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    logger.debug({ userId }, "Fetched Bible books for user.");
    res.json(mockBibleBooks);
  } catch (err: any) {
    logger.error(err, { userId }, "Error fetching Bible books.");
    return res.status(500).json({ message: "Failed to fetch Bible books." });
  }
};

export const getBibleVerses = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { book, chapter } = req.query;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    let verses = mockVerses;
    
    if (book) {
      verses = verses.filter(v => v.book.toLowerCase() === (book as string).toLowerCase());
    }
    
    if (chapter) {
      verses = verses.filter(v => v.chapter === parseInt(chapter as string));
    }

    logger.debug({ userId, book, chapter }, "Fetched Bible verses for user.");
    res.json(verses);
  } catch (err: any) {
    logger.error(err, { userId }, "Error fetching Bible verses.");
    return res.status(500).json({ message: "Failed to fetch Bible verses." });
  }
};

export const getLessons = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Get lessons from database or return mock data
    let lessonsList;
    try {
      lessonsList = await db.select().from(lessons);
      if (lessonsList.length === 0) {
        lessonsList = mockLessons;
      }
    } catch (dbErr) {
      // If database query fails, use mock data
      lessonsList = mockLessons;
    }

    // Get user's progress for each lesson
    const lessonsWithProgress = await Promise.all(
      lessonsList.map(async (lesson) => {
        try {
          const progressRecords = await db
            .select()
            .from(lesson_progress)
            .where(and(
              eq(lesson_progress.user_id, userId),
              eq(lesson_progress.lesson_id, lesson.id)
            ));

          const completed = progressRecords.length > 0 ? progressRecords[0].completed : false;
          const completedAt = progressRecords.length > 0 ? progressRecords[0].completed_at : null;

          return {
            ...lesson,
            completed,
            completedAt
          };
        } catch (progressErr) {
          // If progress query fails, assume not completed
          return {
            ...lesson,
            completed: false,
            completedAt: null
          };
        }
      })
    );

    logger.debug({ userId, count: lessonsWithProgress.length }, "Fetched lessons for user.");
    res.json(lessonsWithProgress);
  } catch (err: any) {
    logger.error(err, { userId }, "Error fetching lessons.");
    return res.status(500).json({ message: "Failed to fetch lessons." });
  }
};

export const getLessonById = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const lessonId = parseInt(req.params.id);
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Try to get from database first
    let lesson;
    try {
      const lessonResult = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
      lesson = lessonResult.length > 0 ? lessonResult[0] : mockLessons.find(l => l.id === lessonId);
    } catch (dbErr) {
      lesson = mockLessons.find(l => l.id === lessonId);
    }

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    // Get user's progress for this lesson
    let completed = false;
    let completedAt = null;
    try {
      const progressRecords = await db
        .select()
        .from(lesson_progress)
        .where(and(
          eq(lesson_progress.user_id, userId),
          eq(lesson_progress.lesson_id, lessonId)
        ));

      if (progressRecords.length > 0) {
        completed = progressRecords[0].completed;
        completedAt = progressRecords[0].completed_at;
      }
    } catch (progressErr) {
      // If progress query fails, assume not completed
    }

    const lessonWithProgress = {
      ...lesson,
      completed,
      completedAt
    };

    logger.debug({ userId, lessonId }, "Fetched lesson details for user.");
    res.json(lessonWithProgress);
  } catch (err: any) {
    logger.error(err, { userId, lessonId }, "Error fetching lesson.");
    return res.status(500).json({ message: "Failed to fetch lesson." });
  }
};

export const markLessonComplete = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const lessonId = parseInt(req.params.id);
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Check if progress record already exists
    const existingProgress = await db
      .select()
      .from(lesson_progress)
      .where(and(
        eq(lesson_progress.user_id, userId),
        eq(lesson_progress.lesson_id, lessonId)
      ));

    if (existingProgress.length > 0) {
      // Update existing record
      const updated = await db
        .update(lesson_progress)
        .set({
          completed: true,
          completed_at: new Date()
        })
        .where(and(
          eq(lesson_progress.user_id, userId),
          eq(lesson_progress.lesson_id, lessonId)
        ))
        .returning();

      logger.info({ userId, lessonId }, "Updated lesson completion for user.");
      res.json({ message: "Lesson marked as complete", progress: updated[0] });
    } else {
      // Create new progress record
      const newProgress = await db
        .insert(lesson_progress)
        .values({
          user_id: userId,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date()
        })
        .returning();

      logger.info({ userId, lessonId }, "Created lesson completion record for user.");
      res.json({ message: "Lesson marked as complete", progress: newProgress[0] });
    }
  } catch (err: any) {
    logger.error(err, { userId, lessonId }, "Error marking lesson complete.");
    return res.status(500).json({ message: "Failed to mark lesson complete." });
  }
};
