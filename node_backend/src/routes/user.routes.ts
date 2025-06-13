// src/routes/user.routes.ts
import { Router } from "express";
import { getUser, getChildren, createChild, getChildProfile, updateChildProfile } from "../controllers/user.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { uploadSingle } from "../middleware/upload.middleware";

const router = Router();

// Protect all user routes with verifyToken
router.get("/me",         verifyToken, getUser);
router.get("/children",   verifyToken, getChildren);
router.post("/children",  verifyToken, uploadSingle, createChild);
router.get("/profile/:userId", verifyToken, getChildProfile);
router.put("/profile/:userId", verifyToken, updateChildProfile);
// Alias for legacy frontend: GET /api/user
router.get("/", verifyToken, getUser);

export default router;
