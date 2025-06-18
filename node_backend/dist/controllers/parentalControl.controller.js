import { db } from "../db/db";
import { screen_time, games, trusted_websites } from "../db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import logger from "../utils/logger";
// ─── Overview Data ─────────────────────────────────────────────────────────
export const getOverviewData = async (req, res) => {
    try {
        const userId = req.user?.id;
        const childId = req.query.childId ? parseInt(req.query.childId) : null;
        const date = req.query.date || new Date().toISOString().split('T')[0];
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const targetUserId = childId || userId;
        // Get screen time data for the date
        const screenTimeData = await db
            .select()
            .from(screen_time)
            .where(and(eq(screen_time.user_id, targetUserId), eq(screen_time.date, date)))
            .limit(1);
        // Get flagged content count
        const flaggedContentCount = await db
            .select()
            .from(games)
            .where(eq(games.flagged, true));
        // Mock recent activity and alerts for now
        const overviewData = {
            screenTime: screenTimeData.length > 0 ? {
                allowedTimeMinutes: screenTimeData[0].allowed_time_minutes || 120,
                usedTimeMinutes: screenTimeData[0].used_time_minutes || 0,
                additionalRewardMinutes: screenTimeData[0].additional_reward_minutes || 0
            } : {
                allowedTimeMinutes: 120,
                usedTimeMinutes: 0,
                additionalRewardMinutes: 0
            },
            flaggedContentCount: flaggedContentCount.length,
            recentActivity: [
                { date: date, usedTime: 45, allowedTime: 120 },
                { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], usedTime: 67, allowedTime: 120 }
            ],
            alerts: []
        };
        res.json(overviewData);
    }
    catch (error) {
        logger.error(error, "Error fetching overview data");
        res.status(500).json({ error: "Failed to fetch overview data" });
    }
};
export const getFlaggedContent = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const flaggedGames = await db
            .select()
            .from(games)
            .where(eq(games.flagged, true));
        res.json(flaggedGames);
    }
    catch (error) {
        logger.error(error, "Error fetching flagged content");
        res.status(500).json({ error: "Failed to fetch flagged content" });
    }
};
export const approveContent = async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const updatedContent = await db
            .update(games)
            .set({
            flagged: false,
            approved: true
        })
            .where(eq(games.id, contentId))
            .returning();
        res.json({ message: "Content approved successfully", content: updatedContent[0] || null });
    }
    catch (error) {
        logger.error(error, "Error approving content");
        res.status(500).json({ error: "Failed to approve content" });
    }
};
export const blockContent = async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const updatedContent = await db
            .update(games)
            .set({
            flagged: true,
            approved: false,
            flag_reason: "Blocked by parent"
        })
            .where(eq(games.id, contentId))
            .returning();
        res.json({ message: "Content blocked successfully", content: updatedContent[0] || null });
    }
    catch (error) {
        logger.error(error, "Error blocking content");
        res.status(500).json({ error: "Failed to block content" });
    }
};
export const addTrustedWebsiteQuick = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { url, name, childId } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const website = await db
            .insert(trusted_websites)
            .values({
            user_id: userId,
            child_id: childId || null,
            url,
            name: name || url
        })
            .returning();
        res.json({ message: "Trusted website added successfully", website: website[0] });
    }
    catch (error) {
        logger.error(error, "Error adding trusted website");
        res.status(500).json({ error: "Failed to add trusted website" });
    }
};
export const blockNewApp = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { name, platform, childId } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // Mock response for now
        res.json({ message: "App blocked successfully", app: { name, platform } });
    }
    catch (error) {
        logger.error(error, "Error blocking app");
        res.status(500).json({ error: "Failed to block app" });
    }
};
export const syncContentRules = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // Mock sync operation
        res.json({
            message: "Content rules synced successfully",
            syncedAt: new Date().toISOString(),
            rulesCount: 12
        });
    }
    catch (error) {
        logger.error(error, "Error syncing content rules");
        res.status(500).json({ error: "Failed to sync content rules" });
    }
};
/* Removed duplicate generateWeeklyReport and generateContentSafetySummary implementations to resolve redeclaration errors. */
// ─── Reports ───────────────────────────────────────────────────────────────
export const generateWeeklyReport = async (req, res) => {
    try {
        const userId = req.user?.id;
        const childId = req.query.childId ? parseInt(req.query.childId) : null;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weeklyData = await db
            .select()
            .from(screen_time)
            .where(and(eq(screen_time.user_id, childId || userId), gte(screen_time.date, sevenDaysAgo.toISOString().split('T')[0])))
            .orderBy(desc(screen_time.date));
        const report = {
            period: {
                start: sevenDaysAgo.toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
            },
            totalScreenTime: weeklyData.reduce((sum, day) => sum + (day.used_time_minutes || 0), 0),
            averageDaily: weeklyData.length > 0
                ? Math.round(weeklyData.reduce((sum, day) => sum + (day.used_time_minutes || 0), 0) / weeklyData.length)
                : 0,
            dailyBreakdown: weeklyData.map(day => ({
                date: day.date,
                screenTime: day.used_time_minutes || 0,
                allowedTime: day.allowed_time_minutes || 120
            })),
            generatedAt: new Date().toISOString()
        };
        res.json(report);
    }
    catch (error) {
        console.error("Error generating weekly report:", error);
        res.status(500).json({ error: "Failed to generate weekly report" });
    }
};
export const generateContentSafetySummary = async (req, res) => {
    try {
        const userId = req.user?.id;
        const childId = req.query.childId ? parseInt(req.query.childId) : null;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const flaggedContent = await db
            .select()
            .from(games)
            .where(and(eq(games.user_id, childId || userId), eq(games.flagged, true)));
        const approvedContent = await db
            .select()
            .from(games)
            .where(and(eq(games.user_id, childId || userId), eq(games.approved, true)));
        const summary = {
            flaggedItems: flaggedContent.length,
            approvedItems: approvedContent.length,
            totalReviewed: flaggedContent.length + approvedContent.length,
            recentFlags: flaggedContent.slice(0, 5).map(item => ({
                name: item.name,
                platform: item.platform,
                reason: item.flag_reason,
                date: item.created_at
            })),
            generatedAt: new Date().toISOString()
        };
        res.json(summary);
    }
    catch (error) {
        console.error("Error generating content safety summary:", error);
        res.status(500).json({ error: "Failed to generate content safety summary" });
    }
};
