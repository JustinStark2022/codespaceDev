import { Router } from "express";
import { getOverviewData, getFlaggedContent, approveContent, blockContent, addTrustedWebsiteQuick, blockNewApp, syncContentRules, generateWeeklyReport, generateContentSafetySummary } from "../controllers/parentalControl.controller";
import { verifyToken } from "../middleware/auth.middleware";
const router = Router();
// ─── Overview ──────────────────────────────────────────────────────────────
// GET /api/parental-control/overview?childId=123&date=2024-01-01
router.get("/overview", verifyToken, getOverviewData);
// ─── Content Management ────────────────────────────────────────────────────
// GET /api/parental-control/flagged-content?childId=123
router.get("/flagged-content", verifyToken, getFlaggedContent);
// PUT /api/parental-control/content/:id/approve
router.put("/content/:id/approve", verifyToken, approveContent);
// PUT /api/parental-control/content/:id/block
router.put("/content/:id/block", verifyToken, blockContent);
// ─── Quick Actions ─────────────────────────────────────────────────────────
// POST /api/parental-control/trusted-website
router.post("/trusted-website", verifyToken, addTrustedWebsiteQuick);
// POST /api/parental-control/block-app
router.post("/block-app", verifyToken, blockNewApp);
// POST /api/parental-control/sync-rules
router.post("/sync-rules", verifyToken, syncContentRules);
// ─── Reports ───────────────────────────────────────────────────────────────
// GET /api/parental-control/reports/weekly?childId=123
router.get("/reports/weekly", verifyToken, generateWeeklyReport);
// GET /api/parental-control/reports/content-safety?childId=123
router.get("/reports/content-safety", verifyToken, generateContentSafetySummary);
export default router;
