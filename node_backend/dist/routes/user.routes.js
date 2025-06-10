// src/routes/user.routes.ts
import { Router } from "express";
import { getUser, getChildren, createChild } from "../controllers/user.controller";
import { verifyToken } from "../middleware/auth.middleware";
const router = Router();
// Protect all user routes with verifyToken
router.get("/me", verifyToken, getUser);
router.get("/children", verifyToken, getChildren);
router.post("/children", verifyToken, createChild);
// Alias for legacy frontend: GET /api/user
router.get("/", verifyToken, getUser);
export default router;
