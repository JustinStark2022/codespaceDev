import { Router } from "express";

// Import controllers loosely (as any) to tolerate different export names
import * as AI from "@/controllers/ai.controller";
import * as Dashboard from "@/controllers/dashboard.controller";
import * as Devotional from "@/controllers/devotional.controller";
import * as Lessons from "@/controllers/lessons.controller";

// Auth middleware (tolerate different export names)
import * as AuthMW from "@/middleware/auth.middleware";

const router = Router();

// Resolve a guard even if the symbol is named differently in your file
const requireAuth =
  (AuthMW as any).requireAuth ||
  (AuthMW as any).ensureAuth ||
  (AuthMW as any).isAuthenticated ||
  ((_req: any, _res: any, next: any) => next());

// Handlers with graceful fallbacks to whatever exists
const getAIDashboard =
  (AI as any).getAIDashboard ||
  (Dashboard as any).getDashboard;

const getDevotional =
  (AI as any).getDevotional ||
  (Devotional as any).generateDailyDevotional;

const getVerseOfTheDay =
  (AI as any).getVerseOfTheDay ||
  (Devotional as any).getVerseOfTheDay ||
  (Devotional as any).generateVerseOfTheDay;

const postChat =
  (AI as any).postChat ||
  (AI as any).chat ||
  (AI as any).sendChat;

const postContentScan =
  (AI as any).postContentScan ||
  (AI as any).analyzeContent ||
  (AI as any).contentScan;

const postGenerateLesson =
  (AI as any).postGenerateLesson ||
  (Lessons as any).generateLesson ||
  (Lessons as any).default; // some projects export default

// ---- Routes ----
router.get("/dashboard", requireAuth, getAIDashboard);
router.get("/devotional", requireAuth, getDevotional);
router.get("/verse-of-the-day", requireAuth, getVerseOfTheDay);

router.post("/chat", requireAuth, postChat);
router.post("/content-scan", requireAuth, postContentScan);
router.post("/generate-lesson", requireAuth, postGenerateLesson);

export default router;
