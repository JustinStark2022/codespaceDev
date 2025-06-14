import { Router } from "express";
import { getUserSettings, updateUserSettings, getContentFilters, updateContentFilters, getScreenTimeSettings, updateScreenTimeSettings, getMonitoringSettings, updateMonitoringSettings, getTrustedWebsites, addTrustedWebsite, removeTrustedWebsite } from "../controllers/settings.controller";
import { verifyToken } from "../middleware/auth.middleware";
const router = Router();
// ─── General Settings ──────────────────────────────────────────────────────
// GET /api/settings/general
router.get("/general", verifyToken, getUserSettings);
// PUT /api/settings/general
router.put("/general", verifyToken, updateUserSettings);
// ─── Content Filter Settings ───────────────────────────────────────────────
// GET /api/settings/content-filters?childId=123
router.get("/content-filters", verifyToken, getContentFilters);
// PUT /api/settings/content-filters
router.put("/content-filters", verifyToken, updateContentFilters);
// ─── Screen Time Settings ──────────────────────────────────────────────────
// GET /api/settings/screen-time?childId=123
router.get("/screen-time", verifyToken, getScreenTimeSettings);
// PUT /api/settings/screen-time
router.put("/screen-time", verifyToken, updateScreenTimeSettings);
// ─── Monitoring Settings ───────────────────────────────────────────────────
// GET /api/settings/monitoring
router.get("/monitoring", verifyToken, getMonitoringSettings);
// PUT /api/settings/monitoring
router.put("/monitoring", verifyToken, updateMonitoringSettings);
// ─── Trusted Websites ──────────────────────────────────────────────────────
// GET /api/settings/trusted-websites?childId=123
router.get("/trusted-websites", verifyToken, getTrustedWebsites);
// POST /api/settings/trusted-websites
router.post("/trusted-websites", verifyToken, addTrustedWebsite);
// DELETE /api/settings/trusted-websites/:id
router.delete("/trusted-websites/:id", verifyToken, removeTrustedWebsite);
export default router;
