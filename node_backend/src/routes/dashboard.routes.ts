import { Router } from "express";
import * as Dashboard from "@/controllers/dashboard.controller";
import * as AuthMW from "@/middleware/auth.middleware";

const router = Router();

const requireAuth =
  (AuthMW as any).requireAuth ||
  (AuthMW as any).ensureAuth ||
  (AuthMW as any).isAuthenticated ||
  ((_req: any, _res: any, next: any) => next());

const getDashboard =
  (Dashboard as any).getDashboard ||
  (Dashboard as any).dashboard ||
  (Dashboard as any).index;

router.get("/dashboard", requireAuth, getDashboard);

export default router;
