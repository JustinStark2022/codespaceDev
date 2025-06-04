import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
} from "@/controllers/auth.controller";
import { verifyToken } from "@/middleware/auth.middleware"; // optional: protect logout

const router = Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes
router.post("/logout", verifyToken, logoutUser); // 🛡️ optional middleware
router.get("/me", verifyToken, getMe);

export default router;
