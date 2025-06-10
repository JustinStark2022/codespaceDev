import { Router } from "express";
import { analyzeGame } from "../controllers/ai.controller";
import { verifyToken } from "../middleware/auth.middleware";
const router = Router();
// POST /api/ai/analyze-game
router.post("/analyze-game", verifyToken, analyzeGame);
export default router;
