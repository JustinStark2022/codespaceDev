import { Router } from "express";
import { generateDailyDevotional, getVerseOfTheDay } from "../controllers/devotional.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// Generate daily devotional
router.get("/daily", verifyToken, generateDailyDevotional);

// Get verse of the day
router.get("/verse", verifyToken, getVerseOfTheDay);

export default router;
