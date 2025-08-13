// src/routes/ai.routes.ts
import { Router } from "express";
import * as AI from "@/controllers/ai.controller";
import * as Dashboard from "@/controllers/dashboard.controller";
import * as Devotional from "@/controllers/devotional.controller";
import * as Lessons from "@/controllers/lessons.controller";
import * as AuthMW from "@/middleware/auth.middleware";
import { pickHandler } from "./_util";

const router = Router();

const requireAuth = pickHandler(AuthMW, ["requireAuth", "ensureAuth", "isAuthenticated", "authGuard", "default"], { kind: "middleware", label: "auth.middleware" });

// Dashboard aggregate
const getAIDashboard = pickHandler({ ...AI, ...Dashboard }, ["getAIDashboard", "getDashboard"], { label: "ai.getAIDashboard" });
router.get("/ai/dashboard", requireAuth as any, getAIDashboard as any);

// Devotional + Verse
const getDevotional = pickHandler({ ...AI, ...Devotional }, ["getDevotional", "generateDailyDevotional"], { label: "ai.getDevotional" });
router.get("/ai/devotional", requireAuth as any, getDevotional as any);

const getVerseOfTheDay = pickHandler({ ...AI, ...Devotional }, ["getVerseOfTheDay", "getVerse"], { label: "ai.getVerseOfTheDay" });
router.get("/ai/verse-of-the-day", requireAuth as any, getVerseOfTheDay as any);

// Chat
const postChat = pickHandler(AI, ["postChat", "chat", "sendChat"], { label: "ai.postChat" });
router.post("/ai/chat", requireAuth as any, postChat as any);

// Content scan
const postContentScan = pickHandler({ ...AI }, ["postContentScan", "scanContent", "analyzeContent"], { label: "ai.postContentScan" });
router.post("/ai/content-scan", requireAuth as any, postContentScan as any);

// Lesson
const postGenerateLesson = pickHandler({ ...AI, ...Lessons }, ["postGenerateLesson", "generateLesson"], { label: "ai.postGenerateLesson" });
router.post("/ai/generate-lesson", requireAuth as any, postGenerateLesson as any);

export default router;
