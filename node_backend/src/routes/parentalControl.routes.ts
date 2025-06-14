import { Router } from "express";
import {
  getOverviewData,
  getFlaggedContent,
  approveContent,
  blockContent,
  addTrustedWebsiteQuick,
  blockNewApp,
  syncContentRules,
  generateWeeklyReport,
  generateContentSafetySummary
} from "../controllers/parentalControl.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// Overview
router.get("/overview", verifyToken, getOverviewData);

// Content management
router.get("/flagged-content", verifyToken, getFlaggedContent);
router.put("/content/:id/approve", verifyToken, approveContent);
router.put("/content/:id/block", verifyToken, blockContent);

// Quick actions
router.post("/trusted-website", verifyToken, addTrustedWebsiteQuick);
router.post("/block-app", verifyToken, blockNewApp);
router.post("/sync-rules", verifyToken, syncContentRules);

// Reports
router.get("/reports/weekly", verifyToken, generateWeeklyReport);
router.get("/reports/content-safety", verifyToken, generateContentSafetySummary);

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
