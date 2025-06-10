import { db } from "../db/db";
import { screen_time as screenTimeTable } from "../db/schema";
import { eq } from "drizzle-orm";
export const getScreenTimeData = async (_req, res) => {
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
// Get screen time for any user by ID - now using real database
export const getScreenTimeForUser = async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        const date = req.query.date;
        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }
        // Query the actual database for screen time data
        const [screenTime] = await db
            .select()
            .from(screenTimeTable)
            .where(eq(screenTimeTable.user_id, userId))
            .limit(1);
        if (screenTime) {
            // Calculate total reward minutes from available fields
            const totalRewards = (screenTime.time_rewards_scripture || 0) +
                (screenTime.time_rewards_lessons || 0) +
                (screenTime.time_rewards_chores || 0);
            // Return real data from database
            res.json({
                allowedTimeMinutes: screenTime.daily_limits_total || 120,
                additionalRewardMinutes: totalRewards,
                usedTimeMinutes: screenTime.usage_today_total || 0,
                date: date || new Date().toISOString().split('T')[0],
                userId: userId
            });
        }
        else {
            // Return default values if no screen time record exists
            res.json({
                allowedTimeMinutes: 120,
                additionalRewardMinutes: 0,
                usedTimeMinutes: 0,
                date: date || new Date().toISOString().split('T')[0],
                userId: userId
            });
        }
    }
    catch (error) {
        console.error("Error fetching screen time:", error);
        res.status(500).json({ message: "Failed to fetch screen time data" });
    }
};
// Update screen time limits for a user - now using real database
export const updateScreenTime = async (req, res) => {
    try {
        const { userId, date, allowedTimeMinutes } = req.body;
        if (!userId || !allowedTimeMinutes) {
            return res.status(400).json({ message: "userId and allowedTimeMinutes are required" });
        }
        const newAllowedTime = Number(allowedTimeMinutes);
        // Check if record exists
        const [existingRecord] = await db
            .select()
            .from(screenTimeTable)
            .where(eq(screenTimeTable.user_id, userId))
            .limit(1);
        if (existingRecord) {
            // Update existing record
            const [updated] = await db
                .update(screenTimeTable)
                .set({
                daily_limits_total: newAllowedTime
            })
                .where(eq(screenTimeTable.user_id, userId))
                .returning();
            const totalRewards = (updated.time_rewards_scripture || 0) +
                (updated.time_rewards_lessons || 0) +
                (updated.time_rewards_chores || 0);
            res.json({
                allowedTimeMinutes: updated.daily_limits_total,
                additionalRewardMinutes: totalRewards,
                usedTimeMinutes: updated.usage_today_total || 0,
                date: date || new Date().toISOString().split('T')[0],
                userId: userId
            });
        }
        else {
            // Create new record
            const [created] = await db
                .insert(screenTimeTable)
                .values({
                user_id: userId,
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
                time_rewards_chores: 0,
                created_at: new Date()
            })
                .returning();
            const totalRewards = (created.time_rewards_scripture || 0) +
                (created.time_rewards_lessons || 0) +
                (created.time_rewards_chores || 0);
            res.json({
                allowedTimeMinutes: created.daily_limits_total,
                additionalRewardMinutes: totalRewards,
                usedTimeMinutes: created.usage_today_total || 0,
                date: date || new Date().toISOString().split('T')[0],
                userId: userId
            });
        }
    }
    catch (error) {
        console.error("Error updating screen time:", error);
        res.status(500).json({ message: "Failed to update screen time" });
    }
};
