import { Router } from "express";
import {
  getBibles,
  getBooks,
  getChapters,
  getVerses,
  getChapterContent,
  getVerse,
  getBiblePassage,
  searchBible,
} from "@/controllers/bible.controller";

/**
 * Bible routes (API.Bible proxy)
 *
 * Intentionally unauthenticated so the Bible Reader can work in demos
 * (and still respects API.Bible key restrictions on the backend).
 */
const router = Router();

// Versions (filtered in controller to preferred list)
router.get("/bibles", getBibles);

// Books + chapters
router.get("/bibles/:bibleId/books", getBooks);
router.get("/bibles/:bibleId/books/:bookId/chapters", getChapters);

// Chapter + verse lists/content
router.get("/bibles/:bibleId/chapters/:chapterId/verses", getVerses);
router.get("/bibles/:bibleId/chapters/:chapterId", getChapterContent);

router.get("/bibles/:bibleId/verses/:verseId", getVerse);

// Optional helpers (if you use them later)
router.get("/bibles/:bibleId/passages/:passageId", getBiblePassage);
router.get("/bibles/:bibleId/search", searchBible);

export default router;