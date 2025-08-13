// src/routes/user.routes.ts
import { Router } from "express";
import * as Users from "@/controllers/user.controller";
import * as AuthMW from "@/middleware/auth.middleware";
import { pickHandler } from "./_util";

const router = Router();
const requireAuth = pickHandler(AuthMW, ["requireAuth", "ensureAuth", "isAuthenticated", "authGuard", "default"], { kind: "middleware" });

const getUser = pickHandler(Users, ["getUser", "me", "getProfile"], { label: "user.get" });
const getChildren = pickHandler(Users, ["getChildren", "listChildren"], { label: "user.children" });
const createChild = pickHandler(Users, ["createChild", "addChild"], { label: "user.createChild" });
const getChild = pickHandler(Users, ["getChildProfile", "getChild"], { label: "user.getChild" });
const updateChild = pickHandler(Users, ["updateChildProfile", "updateChild"], { label: "user.updateChild" });

router.get("/user", requireAuth as any, getUser as any);
router.get("/user/children", requireAuth as any, getChildren as any);
router.post("/user/children", requireAuth as any, createChild as any);
router.get("/user/children/:id", requireAuth as any, getChild as any);
router.put("/user/children/:id", requireAuth as any, updateChild as any);

export default router;
