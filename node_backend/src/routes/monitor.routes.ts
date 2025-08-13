// src/routes/monitor.routes.ts
import { Router } from "express";
import * as Monitor from "@/controllers/monitor.controller";
import * as AI from "@/controllers/ai.controller";
import * as AuthMW from "@/middleware/auth.middleware";
import { pickHandler } from "./_util";

const router = Router();
const requireAuth = pickHandler(AuthMW, ["requireAuth", "ensureAuth", "isAuthenticated", "authGuard", "default"], { kind: "middleware" });

const analyze = pickHandler({ ...Monitor, ...AI }, ["analyzeContent", "postContentScan", "scanContent"], { label: "monitor.analyze" });
const weekly = pickHandler(Monitor, ["getWeeklySummary", "weeklySummary"], { label: "monitor.weekly" });

router.post("/monitor/analyze", requireAuth as any, analyze as any);
router.post("/monitor/weekly-summary", requireAuth as any, weekly as any);

export default router;
