// src/controllers/childDashboard.controller.ts
import { Request, Response } from "express";
import { db } from "@/db/db";
import { screen_time as screenTimeTable, lesson_progress as lpTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const getChildDashboardData = async (
  req: Request & { user?: { id: number } },
  res: Response
) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Fetch today's screen time record with proper date filtering
    const [screen_time] = await db
      .select()
      .from(screenTimeTable)
      .where(
        and(
          eq(screenTimeTable.user_id, userId),
          eq(screenTimeTable.date, today)
        )
      )
      .limit(1);

    // Fetch this user's lesson progress
    const lesson_progress = await db
      .select()
      .from(lpTable)
      .where(eq(lpTable.user_id, userId));

    // Transform screen time data to match frontend expectations
    const screenTime = screen_time ? {
      allowedTimeMinutes: screen_time.allowed_time_minutes || screen_time.daily_limits_total || 120,
      usedTimeMinutes: screen_time.used_time_minutes || screen_time.usage_today_total || 0,
      additionalRewardMinutes: screen_time.additional_reward_minutes ||
        ((screen_time.time_rewards_scripture || 0) +
         (screen_time.time_rewards_lessons || 0) +
         (screen_time.time_rewards_chores || 0)),
      dailyLimits: {
        total: screen_time.daily_limits_total || screen_time.allowed_time_minutes || 120,
        gaming: screen_time.daily_limits_gaming || 60,
        social: screen_time.daily_limits_social || 30,
        educational: screen_time.daily_limits_educational || 30
      },
      usageToday: {
        total: screen_time.usage_today_total || screen_time.used_time_minutes || 0,
        gaming: screen_time.usage_today_gaming || 0,
        social: screen_time.usage_today_social || 0,
        educational: screen_time.usage_today_educational || 0
      },
      timeRewards: {
        fromScripture: screen_time.time_rewards_scripture || 0,
        fromLessons: screen_time.time_rewards_lessons || 0,
        fromChores: screen_time.time_rewards_chores || 0
      }
    } : {
      // Default values if no screen time record exists
      allowedTimeMinutes: 120,
      usedTimeMinutes: 0,
      additionalRewardMinutes: 0,
      dailyLimits: {
        total: 120,
        gaming: 60,
        social: 30,
        educational: 30
      },
      usageToday: {
        total: 0,
        gaming: 0,
        social: 0,
        educational: 0
      },
      timeRewards: {
        fromScripture: 0,
        fromLessons: 0,
        fromChores: 0
      }
    };

    // Transform lesson progress to match frontend expectations
    const lessonProgress = lesson_progress.map(progress => ({
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
