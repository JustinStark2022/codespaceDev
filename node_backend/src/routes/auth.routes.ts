// src/routes/auth.routes.ts
import { Router } from "express";
import { registerUser, loginUser, logoutUser, getMe } from "@/controllers/auth.controller";
import { verifyToken } from "@/middleware/auth.middleware";

const router = Router();

// Public
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected
router.post("/logout", verifyToken, logoutUser);
router.get("/me", verifyToken, getMe);

export default router;