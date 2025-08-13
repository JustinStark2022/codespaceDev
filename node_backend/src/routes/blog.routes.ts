// src/routes/blog.routes.ts
import { Router } from "express";
import * as Blog from "@/controllers/blog.controller";
import * as AuthMW from "@/middleware/auth.middleware";
import { pickHandler } from "./_util";

const router = Router();
const requireAuth = pickHandler(AuthMW, ["requireAuth", "ensureAuth", "isAuthenticated", "authGuard", "default"], { kind: "middleware", label: "auth.middleware" });

const parentBlog = pickHandler(Blog, ["generateParentBlog", "parentBlog"], { label: "blog.parent" });
const kidsBlog = pickHandler(Blog, ["generateKidsBlog", "kidsBlog"], { label: "blog.kids" });

router.post("/blog/parent", requireAuth as any, parentBlog as any);
router.post("/blog/kids", requireAuth as any, kidsBlog as any);

export default router;
