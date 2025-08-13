import { Router } from "express";
import * as Auth from "@/controllers/auth.controller";

const router = Router();

// Allow for differing export names in the controller
const login =
  (Auth as any).login ||
  (Auth as any).loginUser ||
  (Auth as any).postLogin;

const logout =
  (Auth as any).logout ||
  (Auth as any).postLogout;

const register =
  (Auth as any).register ||
  (Auth as any).signup ||
  (Auth as any).createAccount;

router.post("/login", login);
router.post("/logout", logout);
router.post("/register", register);

export default router;
