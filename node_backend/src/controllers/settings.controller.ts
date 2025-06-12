import { Request, Response } from "express";
import { db } from "../db/db";
import { 
  user_settings, 
  content_filters, 
  screen_time_settings, 
  monitoring_settings,
  trusted_websites,
  users
} from "../db/schema";
import { eq, and } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

// ─── General Settings ──────────────────────────────────────────────────────

export const getUserSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const settings = await db
      .select()
      .from(user_settings)
      .where(eq(user_settings.user_id, userId))
      .limit(1);

    if (settings.length === 0) {
      // Create default settings if none exist
      const defaultSettings = await db
        .insert(user_settings)
        .values({ user_id: userId })
        .returning();
      
      return res.json(defaultSettings[0]);
    }

    res.json(settings[0]);
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

export const updateUserSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
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
    } = req.body;

    const updatedSettings = await db
      .update(user_settings)
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
      .where(eq(user_settings.user_id, userId))
      .returning();

    if (updatedSettings.length === 0) {
      // Create new settings if update failed (no existing record)
      const newSettings = await db
        .insert(user_settings)
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
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
};

// ─── Content Filter Settings ───────────────────────────────────────────────

export const getContentFilters = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const childId = req.query.childId ? parseInt(req.query.childId as string) : null;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const filters = await db
      .select()
      .from(content_filters)
      .where(
        childId 
          ? and(eq(content_filters.user_id, userId), eq(content_filters.child_id, childId))
          : eq(content_filters.user_id, userId)
      )
      .limit(1);

    if (filters.length === 0) {
      // Create default filters if none exist
      const defaultFilters = await db
        .insert(content_filters)
        .values({ 
          user_id: userId,
          child_id: childId 
        })
        .returning();
      
      return res.json(defaultFilters[0]);
    }

    res.json(filters[0]);
  } catch (error) {
    console.error("Error fetching content filters:", error);
    res.status(500).json({ error: "Failed to fetch content filters" });
  }
};

export const updateContentFilters = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const childId = req.body.childId ? parseInt(req.body.childId) : null;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      block_violence,
      block_language,
      block_occult,
      block_bullying,
      block_sexual,
      block_blasphemy,
      filter_sensitivity,
      ai_detection_mode,
      realtime_scanning
    } = req.body;

    const whereClause = childId 
      ? and(eq(content_filters.user_id, userId), eq(content_filters.child_id, childId))
      : eq(content_filters.user_id, userId);

    const updatedFilters = await db
      .update(content_filters)
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
      // Create new filters if update failed
      const newFilters = await db
        .insert(content_filters)
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
  } catch (error) {
    console.error("Error updating content filters:", error);
    res.status(500).json({ error: "Failed to update content filters" });
  }
};

// ─── Screen Time Settings ──────────────────────────────────────────────────

export const getScreenTimeSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const childId = req.query.childId ? parseInt(req.query.childId as string) : null;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const settings = await db
      .select()
      .from(screen_time_settings)
      .where(
        childId 
          ? and(eq(screen_time_settings.user_id, userId), eq(screen_time_settings.child_id, childId))
          : eq(screen_time_settings.user_id, userId)
      )
      .limit(1);

    if (settings.length === 0) {
      // Create default settings if none exist
      const defaultSettings = await db
        .insert(screen_time_settings)
        .values({ 
          user_id: userId,
          child_id: childId 
        })
        .returning();
      
      return res.json(defaultSettings[0]);
    }

    res.json(settings[0]);
  } catch (error) {
    console.error("Error fetching screen time settings:", error);
    res.status(500).json({ error: "Failed to fetch screen time settings" });
  }
};

export const updateScreenTimeSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const childId = req.body.childId ? parseInt(req.body.childId) : null;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
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
    } = req.body;

    const whereClause = childId 
      ? and(eq(screen_time_settings.user_id, userId), eq(screen_time_settings.child_id, childId))
      : eq(screen_time_settings.user_id, userId);

    const updatedSettings = await db
      .update(screen_time_settings)
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
      // Create new settings if update failed
      const newSettings = await db
        .insert(screen_time_settings)
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
  } catch (error) {
    console.error("Error updating screen time settings:", error);
    res.status(500).json({ error: "Failed to update screen time settings" });
  }
};

// ─── Monitoring Settings ───────────────────────────────────────────────────

export const getMonitoringSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const settings = await db
      .select()
      .from(monitoring_settings)
      .where(eq(monitoring_settings.user_id, userId))
      .limit(1);

    if (settings.length === 0) {
      // Create default settings if none exist
      const defaultSettings = await db
        .insert(monitoring_settings)
        .values({ user_id: userId })
        .returning();

      return res.json(defaultSettings[0]);
    }

    res.json(settings[0]);
  } catch (error) {
    console.error("Error fetching monitoring settings:", error);
    res.status(500).json({ error: "Failed to fetch monitoring settings" });
  }
};

export const updateMonitoringSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
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
    } = req.body;

    const updatedSettings = await db
      .update(monitoring_settings)
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
      .where(eq(monitoring_settings.user_id, userId))
      .returning();

    if (updatedSettings.length === 0) {
      // Create new settings if update failed
      const newSettings = await db
        .insert(monitoring_settings)
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
  } catch (error) {
    console.error("Error updating monitoring settings:", error);
    res.status(500).json({ error: "Failed to update monitoring settings" });
  }
};

// ─── Trusted Websites ──────────────────────────────────────────────────────

export const getTrustedWebsites = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const childId = req.query.childId ? parseInt(req.query.childId as string) : null;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const websites = await db
      .select()
      .from(trusted_websites)
      .where(
        childId
          ? and(eq(trusted_websites.user_id, userId), eq(trusted_websites.child_id, childId))
          : eq(trusted_websites.user_id, userId)
      );

    res.json(websites);
  } catch (error) {
    console.error("Error fetching trusted websites:", error);
    res.status(500).json({ error: "Failed to fetch trusted websites" });
  }
};

export const addTrustedWebsite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { url, name, childId } = req.body;

    const newWebsite = await db
      .insert(trusted_websites)
      .values({
        user_id: userId,
        child_id: childId || null,
        url,
        name
      })
      .returning();

    res.json(newWebsite[0]);
  } catch (error) {
    console.error("Error adding trusted website:", error);
    res.status(500).json({ error: "Failed to add trusted website" });
  }
};

export const removeTrustedWebsite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const websiteId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deletedWebsite = await db
      .delete(trusted_websites)
      .where(
        and(
          eq(trusted_websites.id, websiteId),
          eq(trusted_websites.user_id, userId)
        )
      )
      .returning();

    if (deletedWebsite.length === 0) {
      return res.status(404).json({ error: "Website not found" });
    }

    res.json({ message: "Website removed successfully" });
  } catch (error) {
    console.error("Error removing trusted website:", error);
    res.status(500).json({ error: "Failed to remove trusted website" });
  }
};
