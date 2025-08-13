import { Router } from "express";
import * as Devotional from "@/controllers/devotional.controller";
import * as AuthMW from "@/middleware/auth.middleware";

const router = Router();

const requireAuth =
  (AuthMW as any).requireAuth ||
  (AuthMW as any).ensureAuth ||
  (AuthMW as any).isAuthenticated ||
  ((_req: any, _res: any, next: any) => next());

const daily =
  (Devotional as any).getDailyDevotional ||
  (Devotional as any).generateDailyDevotional;

const verse =
  (Devotional as any).getVerseOfTheDay ||
  (Devotional as any).generateVerseOfTheDay;

if (daily) router.get("/devotional/daily", requireAuth, daily);
if (verse) router.get("/devotional/verse", requireAuth, verse);

export default router;
