// src/routes/lessons.routes.ts
import { Router } from "express";
import * as Lessons from "@/controllers/lessons.controller";
import * as AuthMW from "@/middleware/auth.middleware";
import { pickHandler } from "./_util";

const router = Router();
const requireAuth = pickHandler(AuthMW, ["requireAuth", "ensureAuth", "isAuthenticated", "authGuard", "default"], { kind: "middleware" });

const generateLesson = pickHandler(Lessons, ["generateLesson", "postGenerateLesson"], { label: "lessons.generate" });

router.post("/lessons/generate", requireAuth as any, generateLesson as any);

export default router;
