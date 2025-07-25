import { Router } from "express";
import { generateParentBlogPost, generateKidsBlogPost } from "../controllers/blog.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// Generate blog post for parents
router.post("/parent", verifyToken, generateParentBlogPost);

// Generate blog post for kids
router.post("/kids", verifyToken, generateKidsBlogPost);

export default router;
