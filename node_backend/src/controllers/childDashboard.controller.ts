// src/controllers/childDashboard.controller.ts
import { Request, Response } from "express";
import { db } from "@/db/db";
import { screen_time, lesson_progress } from "@/db/schema";
import { eq } from "drizzle-orm";
import logger from "@/utils/logger";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const getChildDashboardData = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    logger.warn("getChildDashboardData called without authenticated user.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Get screen time data
    const screenTimeRecords = await db
      .select()
      .from(screen_time)
      .where(eq(screen_time.user_id, userId))
      .limit(1);

    const screenTime = screenTimeRecords.length > 0 ? screenTimeRecords[0] : null;

    // Get lesson progress
    const lessonProgressRecords = await db
      .select()
      .from(lesson_progress)
      .where(eq(lesson_progress.user_id, userId));

    // Transform screen time data
    const screenTimeData = {
      allowedTimeMinutes: screenTime?.allowed_time_minutes || 120,
      usedTimeMinutes: screenTime?.used_time_minutes || 0,
      additionalRewardMinutes: screenTime?.additional_reward_minutes || 0,
      dailyLimits: {
        total: screenTime?.daily_limits_total || 120,
        gaming: screenTime?.daily_limits_gaming || 60,
        social: screenTime?.daily_limits_social || 30,
        educational: screenTime?.daily_limits_educational || 90
      },
      usageToday: {
        total: screenTime?.usage_today_total || 0,
        gaming: screenTime?.usage_today_gaming || 0,
        social: screenTime?.usage_today_social || 0,
        educational: screenTime?.usage_today_educational || 0
      },
      timeRewards: {
        fromScripture: screenTime?.time_rewards_scripture || 0,
        fromLessons: screenTime?.time_rewards_lessons || 0,
        fromChores: screenTime?.time_rewards_chores || 0
      }
    };

    // Transform lesson progress to match frontend expectations
    const lessonProgress = lessonProgressRecords.map(progress => ({
      id: progress.id,
      user_id: progress.user_id,
      lesson_id: progress.lesson_id,
      completed: progress.completed,
      completed_at: progress.completed_at
    }));

    return res.json({
      screenTime,
      lessonProgress
    });

  } catch (error) {
    console.error("Error fetching child dashboard data:", error);
    return res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
};
