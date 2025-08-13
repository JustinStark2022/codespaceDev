import { Router } from "express";
import * as Blog from "@/controllers/blog.controller";
import * as AuthMW from "@/middleware/auth.middleware";

const router = Router();

const requireAuth =
  (AuthMW as any).requireAuth ||
  (AuthMW as any).ensureAuth ||
  (AuthMW as any).isAuthenticated ||
  ((_req: any, _res: any, next: any) => next());

const parentBlog =
  (Blog as any).generateParentBlog || (Blog as any).parentBlog;

const kidsBlog =
  (Blog as any).generateKidsBlog || (Blog as any).kidsBlog;

if (parentBlog) router.post("/blog/parent", requireAuth, parentBlog);
if (kidsBlog) router.post("/blog/kids", requireAuth, kidsBlog);

export default router;
