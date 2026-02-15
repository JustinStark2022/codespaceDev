"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeTrustedWebsite = exports.addTrustedWebsite = exports.getTrustedWebsites = exports.updateMonitoringSettings = exports.getMonitoringSettings = exports.updateScreenTimeSettings = exports.getScreenTimeSettings = exports.updateContentFilters = exports.getContentFilters = exports.updateUserSettings = exports.getUserSettings = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = __importDefault(require("../utils/logger"));
const getUserSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const settings = await db_1.db
            .select()
            .from(schema_1.user_settings)
            .where((0, drizzle_orm_1.eq)(schema_1.user_settings.user_id, userId))
            .limit(1);
        if (settings.length === 0) {
            const defaultSettings = await db_1.db
                .insert(schema_1.user_settings)
                .values({ user_id: userId })
                .returning();
            return res.json(defaultSettings[0]);
        }
        res.json(settings[0]);
    }
    catch (error) {
        logger_1.default.error("Error fetching user settings:", error);
        res.status(500).json({ error: "Failed to fetch settings" });
    }
};
exports.getUserSettings = getUserSettings;
const updateUserSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { content_alerts, screentime_alerts, lesson_completions, device_usage, bible_plan, default_translation, reading_plan, daily_reminders, theme_mode, language, sound_effects } = req.body;
        const updatedSettings = await db_1.db
            .update(schema_1.user_settings)
            .set({
            content_alerts,
            screentime_alerts,
            lesson_completions,
            device_usage,
            bible_plan,
            default_translation,
            reading_plan,
            daily_reminders,
            theme_mode,
            language,
            sound_effects,
            updated_at: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.user_settings.user_id, userId))
            .returning();
        if (updatedSettings.length === 0) {
            const newSettings = await db_1.db
                .insert(schema_1.user_settings)
                .values({
                user_id: userId,
                content_alerts,
                screentime_alerts,
                lesson_completions,
                device_usage,
                bible_plan,
                default_translation,
                reading_plan,
                daily_reminders,
                theme_mode,
                language,
                sound_effects
            })
                .returning();
            return res.json(newSettings[0]);
        }
        res.json(updatedSettings[0]);
    }
    catch (error) {
        logger_1.default.error("Error updating user settings:", error);
        res.status(500).json({ error: "Failed to update settings" });
    }
};
exports.updateUserSettings = updateUserSettings;
const getContentFilters = async (req, res) => {
    try {
        const userId = req.user?.id;
        const childId = req.query.childId ? parseInt(req.query.childId) : null;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const filters = await db_1.db
            .select()
            .from(schema_1.content_filters)
            .where(childId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.content_filters.user_id, userId), (0, drizzle_orm_1.eq)(schema_1.content_filters.child_id, childId))
            : (0, drizzle_orm_1.eq)(schema_1.content_filters.user_id, userId))
            .limit(1);
        if (filters.length === 0) {
            const defaultFilters = await db_1.db
                .insert(schema_1.content_filters)
                .values({
                user_id: userId,
                child_id: childId
            })
                .returning();
            return res.json(defaultFilters[0]);
        }
        res.json(filters[0]);
    }
    catch (error) {
        logger_1.default.error("Error fetching content filters:", error);
        res.status(500).json({ error: "Failed to fetch content filters" });
    }
};
exports.getContentFilters = getContentFilters;
const updateContentFilters = async (req, res) => {
    try {
        const userId = req.user?.id;
        const childId = req.body.childId ? parseInt(req.body.childId) : null;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { block_violence, block_language, block_occult, block_bullying, block_sexual, block_blasphemy, filter_sensitivity, ai_detection_mode, realtime_scanning } = req.body;
        const whereClause = childId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.content_filters.user_id, userId), (0, drizzle_orm_1.eq)(schema_1.content_filters.child_id, childId))
            : (0, drizzle_orm_1.eq)(schema_1.content_filters.user_id, userId);
        const updatedFilters = await db_1.db
            .update(schema_1.content_filters)
            .set({
            block_violence,
            block_language,
            block_occult,
            block_bullying,
            block_sexual,
            block_blasphemy,
            filter_sensitivity,
            ai_detection_mode,
            realtime_scanning,
            updated_at: new Date()
        })
            .where(whereClause)
            .returning();
        if (updatedFilters.length === 0) {
            const newFilters = await db_1.db
                .insert(schema_1.content_filters)
                .values({
                user_id: userId,
                child_id: childId,
                block_violence,
                block_language,
                block_occult,
                block_bullying,
                block_sexual,
                block_blasphemy,
                filter_sensitivity,
                ai_detection_mode,
                realtime_scanning
            })
                .returning();
            return res.json(newFilters[0]);
        }
        res.json(updatedFilters[0]);
    }
    catch (error) {
        logger_1.default.error("Error updating content filters:", error);
        res.status(500).json({ error: "Failed to update content filters" });
    }
};
exports.updateContentFilters = updateContentFilters;
const getScreenTimeSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        const childId = req.query.childId ? parseInt(req.query.childId) : null;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const settings = await db_1.db
            .select()
            .from(schema_1.screen_time_settings)
            .where(childId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.screen_time_settings.user_id, userId), (0, drizzle_orm_1.eq)(schema_1.screen_time_settings.child_id, childId))
            : (0, drizzle_orm_1.eq)(schema_1.screen_time_settings.user_id, userId))
            .limit(1);
        if (settings.length === 0) {
            const defaultSettings = await db_1.db
                .insert(schema_1.screen_time_settings)
                .values({
                user_id: userId,
                child_id: childId
            })
                .returning();
            return res.json(defaultSettings[0]);
        }
        res.json(settings[0]);
    }
    catch (error) {
        logger_1.default.error("Error fetching screen time settings:", error);
        res.status(500).json({ error: "Failed to fetch screen time settings" });
    }
};
exports.getScreenTimeSettings = getScreenTimeSettings;
const updateScreenTimeSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        const childId = req.body.childId ? parseInt(req.body.childId) : null;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { weekday_limit, weekend_limit, sleep_time, wake_time, break_interval, break_duration, lock_after_bedtime, pause_during_bedtime, location_based_rules, emergency_override, allow_rewards, max_reward_time, reward_per_lesson, weekend_bonus } = req.body;
        const whereClause = childId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.screen_time_settings.user_id, userId), (0, drizzle_orm_1.eq)(schema_1.screen_time_settings.child_id, childId))
            : (0, drizzle_orm_1.eq)(schema_1.screen_time_settings.user_id, userId);
        const updatedSettings = await db_1.db
            .update(schema_1.screen_time_settings)
            .set({
            weekday_limit,
            weekend_limit,
            sleep_time,
            wake_time,
            break_interval,
            break_duration,
            lock_after_bedtime,
            pause_during_bedtime,
            location_based_rules,
            emergency_override,
            allow_rewards,
            max_reward_time,
            reward_per_lesson,
            weekend_bonus,
            updated_at: new Date()
        })
            .where(whereClause)
            .returning();
        if (updatedSettings.length === 0) {
            const newSettings = await db_1.db
                .insert(schema_1.screen_time_settings)
                .values({
                user_id: userId,
                child_id: childId,
                weekday_limit,
                weekend_limit,
                sleep_time,
                wake_time,
                break_interval,
                break_duration,
                lock_after_bedtime,
                pause_during_bedtime,
                location_based_rules,
                emergency_override,
                allow_rewards,
                max_reward_time,
                reward_per_lesson,
                weekend_bonus
            })
                .returning();
            return res.json(newSettings[0]);
        }
        res.json(updatedSettings[0]);
    }
    catch (error) {
        logger_1.default.error("Error updating screen time settings:", error);
        res.status(500).json({ error: "Failed to update screen time settings" });
    }
};
exports.updateScreenTimeSettings = updateScreenTimeSettings;
const getMonitoringSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const settings = await db_1.db
            .select()
            .from(schema_1.monitoring_settings)
            .where((0, drizzle_orm_1.eq)(schema_1.monitoring_settings.user_id, userId))
            .limit(1);
        if (settings.length === 0) {
            const defaultSettings = await db_1.db
                .insert(schema_1.monitoring_settings)
                .values({ user_id: userId })
                .returning();
            return res.json(defaultSettings[0]);
        }
        res.json(settings[0]);
    }
    catch (error) {
        logger_1.default.error("Error fetching monitoring settings:", error);
        res.status(500).json({ error: "Failed to fetch monitoring settings" });
    }
};
exports.getMonitoringSettings = getMonitoringSettings;
const updateMonitoringSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { live_activity_feed, screenshot_monitoring, keystroke_logging, monitoring_frequency, instant_alerts, daily_summary, weekly_reports, alert_threshold, data_retention, anonymous_analytics } = req.body;
        const updatedSettings = await db_1.db
            .update(schema_1.monitoring_settings)
            .set({
            live_activity_feed,
            screenshot_monitoring,
            keystroke_logging,
            monitoring_frequency,
            instant_alerts,
            daily_summary,
            weekly_reports,
            alert_threshold,
            data_retention,
            anonymous_analytics,
            updated_at: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.monitoring_settings.user_id, userId))
            .returning();
        if (updatedSettings.length === 0) {
            const newSettings = await db_1.db
                .insert(schema_1.monitoring_settings)
                .values({
                user_id: userId,
                live_activity_feed,
                screenshot_monitoring,
                keystroke_logging,
                monitoring_frequency,
                instant_alerts,
                daily_summary,
                weekly_reports,
                alert_threshold,
                data_retention,
                anonymous_analytics
            })
                .returning();
            return res.json(newSettings[0]);
        }
        res.json(updatedSettings[0]);
    }
    catch (error) {
        logger_1.default.error("Error updating monitoring settings:", error);
        res.status(500).json({ error: "Failed to update monitoring settings" });
    }
};
exports.updateMonitoringSettings = updateMonitoringSettings;
const getTrustedWebsites = async (req, res) => {
    try {
        const userId = req.user?.id;
        const childId = req.query.childId ? parseInt(req.query.childId) : null;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const websites = await db_1.db
            .select()
            .from(schema_1.trusted_websites)
            .where(childId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.trusted_websites.user_id, userId), (0, drizzle_orm_1.eq)(schema_1.trusted_websites.child_id, childId))
            : (0, drizzle_orm_1.eq)(schema_1.trusted_websites.user_id, userId));
        res.json(websites);
    }
    catch (error) {
        logger_1.default.error("Error fetching trusted websites:", error);
        res.status(500).json({ error: "Failed to fetch trusted websites" });
    }
};
exports.getTrustedWebsites = getTrustedWebsites;
const addTrustedWebsite = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { url, name, childId } = req.body;
        const newWebsite = await db_1.db
            .insert(schema_1.trusted_websites)
            .values({
            user_id: userId,
            child_id: childId || null,
            url,
            name
        })
            .returning();
        res.json(newWebsite[0]);
    }
    catch (error) {
        logger_1.default.error("Error adding trusted website:", error);
        res.status(500).json({ error: "Failed to add trusted website" });
    }
};
exports.addTrustedWebsite = addTrustedWebsite;
const removeTrustedWebsite = async (req, res) => {
    try {
        const userId = req.user?.id;
        const websiteId = parseInt(req.params.id);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const deletedWebsite = await db_1.db
            .delete(schema_1.trusted_websites)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.trusted_websites.id, websiteId), (0, drizzle_orm_1.eq)(schema_1.trusted_websites.user_id, userId)))
            .returning();
        if (deletedWebsite.length === 0) {
            return res.status(404).json({ error: "Website not found" });
        }
        res.json({ message: "Website removed successfully" });
    }
    catch (error) {
        logger_1.default.error("Error removing trusted website:", error);
        res.status(500).json({ error: "Failed to remove trusted website" });
    }
};
exports.removeTrustedWebsite = removeTrustedWebsite;
//# sourceMappingURL=settings.controller.js.map