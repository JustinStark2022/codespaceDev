// src/routes/ai.routes.ts
import { Router } from "express";
import { verifyToken } from "@/middleware/auth.middleware";
import { getDashboard } from "@/controllers/dashboard.controller";
// (other imports you already had…)

const router = Router();

router.get("/dashboard", verifyToken, getDashboard);

// keep your existing AI routes (chat, generate, etc)
export default router;