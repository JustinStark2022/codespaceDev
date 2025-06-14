import { Router } from "express";
import { getFlaggedContent, approveContent, blockContent } from "../controllers/monitoring.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// Flagged content routes
router.get("/flagged", verifyToken, getFlaggedContent);
router.post("/approve/:id", verifyToken, approveContent);
router.post("/block/:id", verifyToken, blockContent);

export default router;
