// src/routes/auth.routes.ts
import { Router } from "express";
import * as Auth from "@/controllers/auth.controller";
import { pickHandler } from "./_util";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

const login = pickHandler(Auth, ["login", "loginUser", "handleLogin"], { label: "auth.login" });
const logout = pickHandler(Auth, ["logout", "handleLogout"], { label: "auth.logout" });
const register = pickHandler(Auth, ["register", "registerUser", "signup", "handleRegister"], { label: "auth.register" });
const getMe = pickHandler(Auth, ["getMe", "me"], { label: "auth.getMe" });

router.post("/login", login as any);
router.post("/logout", logout as any);
router.post("/register", register as any);
router.get("/user", requireAuth as any, getMe as any);

export default router;
