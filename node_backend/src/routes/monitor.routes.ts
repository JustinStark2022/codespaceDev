import { Router } from "express";
import * as Monitor from "@/controllers/monitor.controller";
import * as AI from "@/controllers/ai.controller";
import * as AuthMW from "@/middleware/auth.middleware";

const router = Router();

const requireAuth =
  (AuthMW as any).requireAuth ||
  (AuthMW as any).ensureAuth ||
  (AuthMW as any).isAuthenticated ||
  ((_req: any, _res: any, next: any) => next());

const analyze =
  (Monitor as any).analyzeContent ||
  (AI as any).postContentScan ||
  (AI as any).contentScan;

router.post("/monitor/analyze", requireAuth, analyze);

const weekly =
  (Monitor as any).getWeeklySummary ||
  (Monitor as any).weeklySummary;

if (weekly) router.post("/monitor/weekly-summary", requireAuth, weekly);

export default router;
