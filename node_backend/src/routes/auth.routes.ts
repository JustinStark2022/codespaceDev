// src/routes/auth.routes.ts
import { Router } from "express";
import * as Auth from "@/controllers/auth.controller";
import { pickHandler } from "./_util";

const router = Router();

const login = pickHandler(Auth, ["login", "loginUser", "handleLogin"], { label: "auth.login" });
const logout = pickHandler(Auth, ["logout", "handleLogout"], { label: "auth.logout" });
const register = pickHandler(Auth, ["register", "registerUser", "signup", "handleRegister"], { label: "auth.register" });

router.post("/login", login as any);
router.post("/logout", logout as any);
router.post("/register", register as any);

export default router;
