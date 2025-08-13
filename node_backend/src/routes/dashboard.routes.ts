// src/routes/dashboard.routes.ts
import { Router } from "express";
import * as Dashboard from "@/controllers/dashboard.controller";
import * as AI from "@/controllers/ai.controller";
import * as AuthMW from "@/middleware/auth.middleware";
import { pickHandler } from "./_util";

const router = Router();
const requireAuth = pickHandler(AuthMW, ["requireAuth", "ensureAuth", "isAuthenticated", "authGuard", "default"], { kind: "middleware" });

const getDashboard = pickHandler({ ...Dashboard, ...AI }, ["getDashboard", "getAIDashboard"], { label: "dashboard.get" });

router.get("/dashboard", requireAuth as any, getDashboard as any);

export default router;
