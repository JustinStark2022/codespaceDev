import { Request, Response } from "express";
import { db } from "../db/db";
import { screen_time as screenTimeTable } from "../db/schema";
import { eq, and } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const getScreenTimeData = async (_req: Request, res: Response) => {
  res.json({
    usedTimeMinutes: 45,
    allowedTimeMinutes: 120,
    additionalRewardMinutes: 15,
    dailyLimits: {
      total: 120,
      gaming: 60,
      social: 30,
      educational: 30
    },
    usageToday: {
      total: 45,
      gaming: 20,
      social: 15,
      educational: 10
    },
    timeRewards: {
      fromScripture: 10,
      fromLessons: 5,
      fromChores: 0
    },
    schedule: [],
    blockedApps: []
  });
};

// Get screen time for any user by ID - now using real database with date support
export const getScreenTimeForUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.query.userId as string);
    const date = req.query.date as string || new Date().toISOString().split('T')[0];

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Query the actual database for screen time data for specific date
    const [screenTime] = await db
      .select()
      .from(screenTimeTable)
      .where(
        and(
          eq(screenTimeTable.user_id, userId),
          eq(screenTimeTable.date, date)
        )
      )
      .limit(1);

    if (screenTime) {
      // Calculate total reward minutes from available fields
      const totalRewards = (screenTime.time_rewards_scripture || 0) +
                          (screenTime.time_rewards_lessons || 0) +
                          (screenTime.time_rewards_chores || 0);

      // Return real data from database
      res.json({
        allowedTimeMinutes: screenTime.allowed_time_minutes || screenTime.daily_limits_total || 120,
        additionalRewardMinutes: screenTime.additional_reward_minutes || totalRewards,
        usedTimeMinutes: screenTime.used_time_minutes || screenTime.usage_today_total || 0,
        date: date,
        userId: userId,
        // Additional detailed breakdown
        dailyLimits: {
          total: screenTime.daily_limits_total || 120,
          gaming: screenTime.daily_limits_gaming || 60,
          social: screenTime.daily_limits_social || 30,
          educational: screenTime.daily_limits_educational || 30
        },
        usageToday: {
          total: screenTime.usage_today_total || 0,
          gaming: screenTime.usage_today_gaming || 0,
          social: screenTime.usage_today_social || 0,
          educational: screenTime.usage_today_educational || 0
        },
        timeRewards: {
          fromScripture: screenTime.time_rewards_scripture || 0,
          fromLessons: screenTime.time_rewards_lessons || 0,
          fromChores: screenTime.time_rewards_chores || 0
        }
      });
    } else {
      // Return default values if no screen time record exists for this date
      res.json({
        allowedTimeMinutes: 120,
        additionalRewardMinutes: 0,
        usedTimeMinutes: 0,
        date: date,
        userId: userId,
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
      });
    }
  } catch (error) {
    console.error("Error fetching screen time:", error);
    res.status(500).json({ message: "Failed to fetch screen time data" });
  }
};

// Update screen time limits for a user - using real database with date support
export const updateScreenTime = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, date, allowedTimeMinutes } = req.body as {
      userId: number;
      date?: string;
      allowedTimeMinutes: number | string
    };

    if (!userId || !allowedTimeMinutes) {
      return res.status(400).json({ message: "userId and allowedTimeMinutes are required" });
    }

    const newAllowedTime = Number(allowedTimeMinutes);
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Check if record exists for this specific date
    const [existingRecord] = await db
      .select()
      .from(screenTimeTable)
      .where(
        and(
          eq(screenTimeTable.user_id, userId),
          eq(screenTimeTable.date, targetDate)
        )
      )
      .limit(1);

    if (existingRecord) {
      // Update existing record for this date
      const [updated] = await db
        .update(screenTimeTable)
        .set({
          allowed_time_minutes: newAllowedTime,
          daily_limits_total: newAllowedTime,
          daily_limits_gaming: Math.floor(newAllowedTime * 0.5),
          daily_limits_social: Math.floor(newAllowedTime * 0.25),
          daily_limits_educational: Math.floor(newAllowedTime * 0.25),
          updated_at: new Date()
        })
        .where(
          and(
            eq(screenTimeTable.user_id, userId),
            eq(screenTimeTable.date, targetDate)
          )
        )
        .returning();

      const totalRewards = (updated.time_rewards_scripture || 0) +
                          (updated.time_rewards_lessons || 0) +
                          (updated.time_rewards_chores || 0);

      res.json({
        allowedTimeMinutes: updated.allowed_time_minutes || updated.daily_limits_total,
        additionalRewardMinutes: updated.additional_reward_minutes || totalRewards,
        usedTimeMinutes: updated.used_time_minutes || updated.usage_today_total || 0,
        date: targetDate,
        userId: userId,
        dailyLimits: {
          total: updated.daily_limits_total,
          gaming: updated.daily_limits_gaming,
          social: updated.daily_limits_social,
          educational: updated.daily_limits_educational
        },
        usageToday: {
          total: updated.usage_today_total || updated.used_time_minutes || 0,
          gaming: updated.usage_today_gaming || 0,
          social: updated.usage_today_social || 0,
          educational: updated.usage_today_educational || 0
        },
        timeRewards: {
          fromScripture: updated.time_rewards_scripture || 0,
          fromLessons: updated.time_rewards_lessons || 0,
          fromChores: updated.time_rewards_chores || 0
        }
      });
    } else {
      // Create new record for this date
      const [created] = await db
        .insert(screenTimeTable)
        .values({
          user_id: userId,
          date: targetDate,
          allowed_time_minutes: newAllowedTime,
          used_time_minutes: 0,
          additional_reward_minutes: 0,
          daily_limits_total: newAllowedTime,
          daily_limits_gaming: Math.floor(newAllowedTime * 0.5),
          daily_limits_social: Math.floor(newAllowedTime * 0.25),
          daily_limits_educational: Math.floor(newAllowedTime * 0.25),
          usage_today_total: 0,
          usage_today_gaming: 0,
          usage_today_social: 0,
          usage_today_educational: 0,
          time_rewards_scripture: 0,
          time_rewards_lessons: 0,
          time_rewards_chores: 0
        })
        .returning();

      const totalRewards = (created.time_rewards_scripture || 0) +
                          (created.time_rewards_lessons || 0) +
                          (created.time_rewards_chores || 0);

      res.json({
        allowedTimeMinutes: created.allowed_time_minutes,
        additionalRewardMinutes: created.additional_reward_minutes || totalRewards,
        usedTimeMinutes: created.used_time_minutes,
        date: targetDate,
        userId: userId,
        dailyLimits: {
          total: created.daily_limits_total,
          gaming: created.daily_limits_gaming,
          social: created.daily_limits_social,
          educational: created.daily_limits_educational
        },
        usageToday: {
          total: created.usage_today_total,
          gaming: created.usage_today_gaming,
          social: created.usage_today_social,
          educational: created.usage_today_educational
        },
        timeRewards: {
          fromScripture: created.time_rewards_scripture,
          fromLessons: created.time_rewards_lessons,
          fromChores: created.time_rewards_chores
        }
      });
    }
  } catch (error) {
    console.error("Error updating screen time:", error);
    res.status(500).json({ message: "Failed to update screen time" });
  }
};

// Add new function to update screen time usage (when child actually uses time)
export const updateScreenTimeUsage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, date, usedTimeMinutes, category } = req.body as {
      userId: number;
      date?: string;
      usedTimeMinutes: number;
      category?: 'gaming' | 'social' | 'educational';
    };

    if (!userId || usedTimeMinutes === undefined) {
      return res.status(400).json({ message: "userId and usedTimeMinutes are required" });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get or create record for this date
    let [screenTime] = await db
      .select()
      .from(screenTimeTable)
      .where(
        and(
          eq(screenTimeTable.user_id, userId),
          eq(screenTimeTable.date, targetDate)
        )
      )
      .limit(1);

    if (!screenTime) {
      // Create new record if it doesn't exist
      [screenTime] = await db
        .insert(screenTimeTable)
        .values({
          user_id: userId,
          date: targetDate,
          allowed_time_minutes: 120,
          used_time_minutes: usedTimeMinutes,
          additional_reward_minutes: 0,
          daily_limits_total: 120,
          daily_limits_gaming: 60,
          daily_limits_social: 30,
          daily_limits_educational: 30,
          usage_today_total: usedTimeMinutes,
          usage_today_gaming: category === 'gaming' ? usedTimeMinutes : 0,
          usage_today_social: category === 'social' ? usedTimeMinutes : 0,
          usage_today_educational: category === 'educational' ? usedTimeMinutes : 0,
          time_rewards_scripture: 0,
          time_rewards_lessons: 0,
          time_rewards_chores: 0
        })
        .returning();
    } else {
      // Update existing record
      const updateData: any = {
        used_time_minutes: usedTimeMinutes,
        usage_today_total: usedTimeMinutes,
        updated_at: new Date()
      };

      // Update category-specific usage if provided
      if (category === 'gaming') {
        updateData.usage_today_gaming = usedTimeMinutes;
      } else if (category === 'social') {
        updateData.usage_today_social = usedTimeMinutes;
      } else if (category === 'educational') {
        updateData.usage_today_educational = usedTimeMinutes;
      }

      [screenTime] = await db
        .update(screenTimeTable)
        .set(updateData)
        .where(
          and(
            eq(screenTimeTable.user_id, userId),
            eq(screenTimeTable.date, targetDate)
          )
        )
        .returning();
    }

    const totalRewards = (screenTime.time_rewards_scripture || 0) +
                        (screenTime.time_rewards_lessons || 0) +
                        (screenTime.time_rewards_chores || 0);

    res.json({
      allowedTimeMinutes: screenTime.allowed_time_minutes || screenTime.daily_limits_total,
      additionalRewardMinutes: screenTime.additional_reward_minutes || totalRewards,
      usedTimeMinutes: screenTime.used_time_minutes || screenTime.usage_today_total,
      date: targetDate,
      userId: userId,
      message: "Screen time usage updated successfully"
    });

  } catch (error) {
    console.error("Error updating screen time usage:", error);
    res.status(500).json({ message: "Failed to update screen time usage" });
  }
};

