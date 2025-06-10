import { Router } from "express";
import { getFlaggedGames, approveGame, flagGame } from "../controllers/games.controller";
import { verifyToken } from "@/middleware/auth.middleware";

const router = Router();

router.get("/flagged", verifyToken, getFlaggedGames);
router.post("/approve/:id", verifyToken, approveGame);
router.post("/block/:id", verifyToken, flagGame);

export default router;