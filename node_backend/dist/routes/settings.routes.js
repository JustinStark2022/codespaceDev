import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import { db } from "@/db/db";
import { user_settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import logger from "@/utils/logger";
const router = Router();
// Get user settings
router.get("/", verifyToken, async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const settings = await db
            .select()
            .from(user_settings)
            .where(eq(user_settings.user_id, userId))
            .limit(1);
        if (settings.length === 0) {
            // Return default settings if none exist
            const defaultSettings = {
                content_alerts: true,
                screentime_alerts: true,
                lesson_completions: true,
                device_usage: true,
                bible_plan: true,
                default_translation: "NIV",
                reading_plan: "chronological",
                daily_reminders: true,
                theme_mode: "light",
                language: "en",
                sound_effects: true
            };
            return res.json(defaultSettings);
        }
        res.json(settings[0]);
    }
    catch (err) {
        logger.error(err, { userId }, "Error fetching user settings");
        res.status(500).json({ message: "Failed to fetch settings" });
    }
});
// Update user settings
router.put("/", verifyToken, async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const updatedSettings = await db
            .update(user_settings)
            .set({
            ...req.body,
            updated_at: new Date()
        })
            .where(eq(user_settings.user_id, userId))
            .returning();
        if (updatedSettings.length === 0) {
            // Create settings if they don't exist
            const newSettings = await db
                .insert(user_settings)
                .values({
                user_id: userId,
                ...req.body
            })
                .returning();
            return res.json(newSettings[0]);
        }
        res.json(updatedSettings[0]);
    }
    catch (err) {
        logger.error(err, { userId }, "Error updating user settings");
        res.status(500).json({ message: "Failed to update settings" });
    }
});
export default router;
