// src/routes/bible.routes.ts
import { Router } from "express";
import {
  getBibles,
  getBooks,
  getChapters,
  getChapterContent,
  getVerse,
  getVerses,
  getBiblePassage,
  searchBible,
  getBibleVerses,
  getBibleBooks,
  getLessons,
  getLessonById,
  markLessonComplete,
} from "../controllers/bible.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// All routes protected with authentication
router.get("/bibles", verifyToken, getBibles);
router.get("/bibles/:bibleId/books", verifyToken, getBooks);
router.get("/bibles/:bibleId/books/:bookId/chapters", verifyToken, getChapters);
router.get("/bibles/:bibleId/chapters/:chapterId", verifyToken, getChapterContent);
router.get("/bibles/:bibleId/chapters/:chapterId/verses", verifyToken, getVerses);
router.get("/bibles/:bibleId/verses/:verseId", verifyToken, getVerse);
router.get("/bibles/:bibleId/passages/:passageId", verifyToken, getBiblePassage);
router.get("/bibles/:bibleId/search", verifyToken, searchBible);

// Bible verses and books
router.get("/verses", verifyToken, getBibleVerses);
router.get("/books", verifyToken, getBibleBooks);

// Lessons
router.get("/lessons", verifyToken, getLessons);
router.get("/lessons/:id", verifyToken, getLessonById);
router.post("/lessons/:id/complete", verifyToken, markLessonComplete);

export default router;
