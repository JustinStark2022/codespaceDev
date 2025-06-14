// src/routes/user.routes.ts
import { Router } from "express";
import { getUser, getChildren, createChild, getChildProfile, updateChildProfile } from "../controllers/user.controller";
import { verifyToken } from "../middleware/auth.middleware";
import upload from "../middleware/upload.middleware";

const router = Router();

// Get current user profile
router.get("/profile", verifyToken, getUser);

// Parent routes for managing children
router.get("/children", verifyToken, getChildren);
router.post("/children", verifyToken, createChild);
router.get("/children/:id", verifyToken, getChildProfile);
router.put("/children/:id", verifyToken, upload.single('profilePicture'), updateChildProfile);

export default router;
