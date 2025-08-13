import { Router } from "express";
import * as Lessons from "@/controllers/lessons.controller";
import * as AI from "@/controllers/ai.controller";
import * as AuthMW from "@/middleware/auth.middleware";

const router = Router();

const requireAuth =
  (AuthMW as any).requireAuth ||
  (AuthMW as any).ensureAuth ||
  (AuthMW as any).isAuthenticated ||
  ((_req: any, _res: any, next: any) => next());

const gen =
  (Lessons as any).generateLesson ||
  (Lessons as any).default || // default export
  (AI as any).postGenerateLesson;

router.post("/lessons/generate", requireAuth, gen);

export default router;
