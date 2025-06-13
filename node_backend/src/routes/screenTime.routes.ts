import { Router } from "express";
import { getScreenTimeForUser, updateScreenTime, updateScreenTimeUsage } from "../controllers/screenTime.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// GET /api/screentime?userId=...&date=...
router.get("/", verifyToken, getScreenTimeForUser);

// POST /api/screentime/update - Update allowed time limits
router.post("/update", verifyToken, updateScreenTime);

// POST /api/screentime/usage - Update actual time used
router.post("/usage", verifyToken, updateScreenTimeUsage);

export default router;
