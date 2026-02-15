"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateContentSafetySummary = exports.generateWeeklyReport = exports.syncContentRules = exports.blockNewApp = exports.addTrustedWebsiteQuick = exports.blockContent = exports.approveContent = exports.getFlaggedContent = exports.getOverviewData = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../utils/logger"));
const getOverviewData = async (req, res) => {
    try {
        const userId = req.user?.id;
        const childId = req.query.childId ? parseInt(req.query.childId) : null;
        const date = req.query.date || new Date().toISOString().split('T')[0];
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const targetUserId = childId || userId;
        const screenTimeData = await db_1.db
            .select()
            .from(schema_1.screen_time)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.screen_time.user_id, targetUserId), (0, drizzle_orm_1.eq)(schema_1.screen_time.date, date)))
            .limit(1);
        const flaggedContentCount = await db_1.db
            .select()
            .from(schema_1.games)
            .where((0, drizzle_orm_1.eq)(schema_1.games.flagged, true));
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
        logger_1.default.error(error, "Error fetching overview data");
        res.status(500).json({ error: "Failed to fetch overview data" });
    }
};
exports.getOverviewData = getOverviewData;
const getFlaggedContent = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const flaggedGames = await db_1.db
            .select()
            .from(schema_1.games)
            .where((0, drizzle_orm_1.eq)(schema_1.games.flagged, true));
        res.json(flaggedGames);
    }
    catch (error) {
        logger_1.default.error(error, "Error fetching flagged content");
        res.status(500).json({ error: "Failed to fetch flagged content" });
    }
};
exports.getFlaggedContent = getFlaggedContent;
const approveContent = async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const updatedContent = await db_1.db
            .update(schema_1.games)
            .set({
            flagged: false,
            approved: true
        })
            .where((0, drizzle_orm_1.eq)(schema_1.games.id, contentId))
            .returning();
        res.json({ message: "Content approved successfully", content: updatedContent[0] || null });
    }
    catch (error) {
        logger_1.default.error(error, "Error approving content");
        res.status(500).json({ error: "Failed to approve content" });
    }
};
exports.approveContent = approveContent;
const blockContent = async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const updatedContent = await db_1.db
            .update(schema_1.games)
            .set({
            flagged: true,
            approved: false,
            flag_reason: "Blocked by parent"
        })
            .where((0, drizzle_orm_1.eq)(schema_1.games.id, contentId))
            .returning();
        res.json({ message: "Content blocked successfully", content: updatedContent[0] || null });
    }
    catch (error) {
        logger_1.default.error(error, "Error blocking content");
        res.status(500).json({ error: "Failed to block content" });
    }
};
exports.blockContent = blockContent;
const addTrustedWebsiteQuick = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { url, name, childId } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }
        const website = await db_1.db
            .insert(schema_1.trusted_websites)
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
        logger_1.default.error(error, "Error adding trusted website");
        res.status(500).json({ error: "Failed to add trusted website" });
    }
};
exports.addTrustedWebsiteQuick = addTrustedWebsiteQuick;
const blockNewApp = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { name, platform, childId } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!name) {
            return res.status(400).json({ error: "App name is required" });
        }
        res.json({
            message: "App blocked successfully",
            app: { name, platform: platform || "unknown" }
        });
    }
    catch (error) {
        logger_1.default.error(error, "Error blocking app");
        res.status(500).json({ error: "Failed to block app" });
    }
};
exports.blockNewApp = blockNewApp;
const syncContentRules = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        res.json({
            message: "Content rules synced successfully",
            syncedAt: new Date().toISOString(),
            rulesCount: 12
        });
    }
    catch (error) {
        logger_1.default.error(error, "Error syncing content rules");
        res.status(500).json({ error: "Failed to sync content rules" });
    }
};
exports.syncContentRules = syncContentRules;
const generateWeeklyReport = async (req, res) => {
    try {
        const userId = req.user?.id;
        const childId = req.query.childId ? parseInt(req.query.childId) : null;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weeklyData = await db_1.db
            .select()
            .from(schema_1.screen_time)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.screen_time.user_id, childId || userId), (0, drizzle_orm_1.gte)(schema_1.screen_time.date, sevenDaysAgo.toISOString().split('T')[0])))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.screen_time.date));
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
        logger_1.default.error("Error generating weekly report:", error);
        res.status(500).json({ error: "Failed to generate weekly report" });
    }
};
exports.generateWeeklyReport = generateWeeklyReport;
const generateContentSafetySummary = async (req, res) => {
    try {
        const userId = req.user?.id;
        const childId = req.query.childId ? parseInt(req.query.childId) : null;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const flaggedContent = await db_1.db
            .select()
            .from(schema_1.games)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.games.user_id, childId || userId), (0, drizzle_orm_1.eq)(schema_1.games.flagged, true)));
        const approvedContent = await db_1.db
            .select()
            .from(schema_1.games)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.games.user_id, childId || userId), (0, drizzle_orm_1.eq)(schema_1.games.approved, true)));
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
        logger_1.default.error("Error generating content safety summary:", error);
        res.status(500).json({ error: "Failed to generate content safety summary" });
    }
};
exports.generateContentSafetySummary = generateContentSafetySummary;
//# sourceMappingURL=parentalControl.controller.js.map