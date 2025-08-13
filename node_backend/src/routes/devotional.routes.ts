// src/routes/devotional.routes.ts
import { Router } from "express";
import * as Devotional from "@/controllers/devotional.controller";
import * as AI from "@/controllers/ai.controller";
import * as AuthMW from "@/middleware/auth.middleware";
import { pickHandler } from "./_util";

const router = Router();
const requireAuth = pickHandler(AuthMW, ["requireAuth", "ensureAuth", "isAuthenticated", "authGuard", "default"], { kind: "middleware" });

const getDaily = pickHandler({ ...Devotional, ...AI }, ["getDailyDevotional", "generateDailyDevotional", "getDevotional"], { label: "devotional.daily" });
const getVerse = pickHandler({ ...Devotional, ...AI }, ["getVerseOfTheDay", "getVerse"], { label: "devotional.verse" });

router.get("/devotional/daily", requireAuth as any, getDaily as any);
router.get("/devotional/verse", requireAuth as any, getVerse as any);

export default router;
