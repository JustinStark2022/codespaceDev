import { Router } from "express";
import * as Users from "@/controllers/user.controller";
import * as AuthMW from "@/middleware/auth.middleware";

const router = Router();

const requireAuth =
  (AuthMW as any).requireAuth ||
  (AuthMW as any).ensureAuth ||
  (AuthMW as any).isAuthenticated ||
  ((_req: any, _res: any, next: any) => next());

const getUser =
  (Users as any).getUser || (Users as any).profile || (Users as any).me;

const getChildren =
  (Users as any).getChildren || (Users as any).children;

const createChild =
  (Users as any).createChild || (Users as any).create;

const getChildProfile =
  (Users as any).getChildProfile || (Users as any).getChild;

const updateChildProfile =
  (Users as any).updateChildProfile || (Users as any).updateChild;

router.get("/user", requireAuth, getUser);
if (getChildren) router.get("/user/children", requireAuth, getChildren);
if (createChild) router.post("/user/children", requireAuth, createChild);
if (getChildProfile) router.get("/user/children/:id", requireAuth, getChildProfile);
if (updateChildProfile) router.put("/user/children/:id", requireAuth, updateChildProfile);

export default router;
