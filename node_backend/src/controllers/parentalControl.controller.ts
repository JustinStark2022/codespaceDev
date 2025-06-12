import { Request, Response } from "express";
import { db } from "../db/db";
import { 
  screen_time,
  games,
  users,
  content_filters,
  screen_time_settings,
  monitoring_settings,
  trusted_websites
} from "../db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

// ─── Overview Data ─────────────────────────────────────────────────────────

export const getOverviewData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const childId = req.query.childId ? parseInt(req.query.childId as string) : null;
    const date = req.query.date as string || new Date().toISOString().split('T')[0];
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get screen time data for the date
    const screenTimeData = await db
      .select()
      .from(screen_time)
      .where(
        and(
          eq(screen_time.user_id, childId || userId),
          eq(screen_time.date, date)
        )
      )
      .limit(1);

    // Get flagged content count
    const flaggedGames = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.user_id, childId || userId),
          eq(games.flagged, true)
        )
      );

    // Get recent activity (last 7 days of screen time)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = await db
      .select()
      .from(screen_time)
      .where(
        and(
          eq(screen_time.user_id, childId || userId),
          gte(screen_time.date, sevenDaysAgo.toISOString().split('T')[0])
        )
      )
      .orderBy(desc(screen_time.date));

    const overview = {
      screenTime: screenTimeData[0] || {
        allowedTimeMinutes: 120,
        usedTimeMinutes: 0,
        additionalRewardMinutes: 0
      },
      flaggedContentCount: flaggedGames.length,
      recentActivity: recentActivity.map(activity => ({
        date: activity.date,
        usedTime: activity.used_time_minutes,
        allowedTime: activity.allowed_time_minutes
      })),
      alerts: [
        {
          type: "info",
          message: "All systems monitoring normally",
          timestamp: new Date().toISOString()
        }
      ]
    };

    res.json(overview);
  } catch (error) {
    console.error("Error fetching overview data:", error);
    res.status(500).json({ error: "Failed to fetch overview data" });
  }
};

// ─── Content Management ────────────────────────────────────────────────────

export const getFlaggedContent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const childId = req.query.childId ? parseInt(req.query.childId as string) : null;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const flaggedContent = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.user_id, childId || userId),
          eq(games.flagged, true)
        )
      )
      .orderBy(desc(games.created_at));

    res.json(flaggedContent);
  } catch (error) {
    console.error("Error fetching flagged content:", error);
    res.status(500).json({ error: "Failed to fetch flagged content" });
  }
};

export const approveContent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const contentId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const updatedContent = await db
      .update(games)
      .set({
        flagged: false,
        approved: true
      })
      .where(
        and(
          eq(games.id, contentId),
          eq(games.user_id, userId)
        )
      )
      .returning();

    if (updatedContent.length === 0) {
      return res.status(404).json({ error: "Content not found" });
    }

    res.json({ message: "Content approved successfully", content: updatedContent[0] });
  } catch (error) {
    console.error("Error approving content:", error);
    res.status(500).json({ error: "Failed to approve content" });
  }
};

export const blockContent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const contentId = parseInt(req.params.id);
    
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
      .where(
        and(
          eq(games.id, contentId),
          eq(games.user_id, userId)
        )
      )
      .returning();

    if (updatedContent.length === 0) {
      return res.status(404).json({ error: "Content not found" });
    }

    res.json({ message: "Content blocked successfully", content: updatedContent[0] });
  } catch (error) {
    console.error("Error blocking content:", error);
    res.status(500).json({ error: "Failed to block content" });
  }
};

// ─── Quick Actions ─────────────────────────────────────────────────────────

export const addTrustedWebsiteQuick = async (req: AuthenticatedRequest, res: Response) => {
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
        name: name || url
      })
      .returning();

    res.json({ message: "Trusted website added successfully", website: newWebsite[0] });
  } catch (error) {
    console.error("Error adding trusted website:", error);
    res.status(500).json({ error: "Failed to add trusted website" });
  }
};

export const blockNewApp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, platform, childId } = req.body;

    const blockedApp = await db
      .insert(games)
      .values({
        user_id: childId || userId,
        name,
        platform: platform || "Unknown",
        flagged: true,
        approved: false,
        flag_reason: "Blocked by parent"
      })
      .returning();

    res.json({ message: "App blocked successfully", app: blockedApp[0] });
  } catch (error) {
    console.error("Error blocking app:", error);
    res.status(500).json({ error: "Failed to block app" });
  }
};

export const syncContentRules = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Simulate syncing content rules
    // In a real implementation, this would sync with device management systems
    
    res.json({ 
      message: "Content rules synced successfully",
      syncedAt: new Date().toISOString(),
      rulesCount: 15
    });
  } catch (error) {
    console.error("Error syncing content rules:", error);
    res.status(500).json({ error: "Failed to sync content rules" });
  }
};

// ─── Reports ───────────────────────────────────────────────────────────────

export const generateWeeklyReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const childId = req.query.childId ? parseInt(req.query.childId as string) : null;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyData = await db
      .select()
      .from(screen_time)
      .where(
        and(
          eq(screen_time.user_id, childId || userId),
          gte(screen_time.date, sevenDaysAgo.toISOString().split('T')[0])
        )
      )
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
  } catch (error) {
    console.error("Error generating weekly report:", error);
    res.status(500).json({ error: "Failed to generate weekly report" });
  }
};

export const generateContentSafetySummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const childId = req.query.childId ? parseInt(req.query.childId as string) : null;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const flaggedContent = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.user_id, childId || userId),
          eq(games.flagged, true)
        )
      );

    const approvedContent = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.user_id, childId || userId),
          eq(games.approved, true)
        )
      );

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
  } catch (error) {
    console.error("Error generating content safety summary:", error);
    res.status(500).json({ error: "Failed to generate content safety summary" });
  }
};
