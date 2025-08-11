// src/routes/user.routes.ts
import { Router } from "express";
import {
  getUser,
  getChildren,
  createChild,
  getChildProfile,
  updateChildProfile,
} from "@/controllers/user.controller";
import { verifyToken } from "@/middleware/auth.middleware";

const router = Router();

// GET the logged-in user
router.get("/user", verifyToken, getUser);

// Children management for the parent
router.get("/user/children", verifyToken, getChildren);
router.post("/user/children", verifyToken, createChild);
router.get("/user/children/:id", verifyToken, getChildProfile);
router.put("/user/children/:id", verifyToken, updateChildProfile);

export default router;
