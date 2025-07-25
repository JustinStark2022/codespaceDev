import { Router } from "express";
import { analyzeContent, generateWeeklySummary } from "../controllers/monitor.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// Analyze content for safety
router.post("/analyze", verifyToken, analyzeContent);

// Generate weekly family summary
router.post("/weekly-summary", verifyToken, generateWeeklySummary);

export default router;
