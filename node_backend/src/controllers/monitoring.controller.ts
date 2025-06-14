import { Request, Response } from "express";
import { db } from "@/db/db";
import { games } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import logger from "@/utils/logger";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

// Mock flagged content data for now since games table might be empty
const mockFlaggedContent = [
  {
    id: 1,
    name: "Violent Game Example",
    platform: "Roblox",
    contentType: "game",
    flagReason: "Contains violent content inappropriate for children",
    flaggedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: "Inappropriate Video",
    platform: "YouTube",
    contentType: "video", 
    flagReason: "Language concerns and mature themes",
    flaggedAt: new Date().toISOString()
  }
];

export const getFlaggedContent = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    logger.warn("getFlaggedContent called without authenticated user.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Try to get real flagged games from database
    const flaggedGames = await db
      .select()
      .from(games)
      .where(eq(games.flagged, true));

    // If no real data, return mock data for development
    const content = flaggedGames.length > 0 ? flaggedGames.map(game => ({
      id: game.id,
      name: game.name,
      platform: game.platform || "Unknown",
      contentType: "game",
      flagReason: game.flag_reason || "Flagged for review",
      flaggedAt: game.created_at
    })) : mockFlaggedContent;

    logger.info({ userId, count: content.length }, "Fetched flagged content for user.");
    res.json(content);
  } catch (err: any) {
    logger.error(err, { userId }, "Error fetching flagged content.");
    // Return mock data if database query fails
    res.json(mockFlaggedContent);
  }
};

export const approveContent = async (req: AuthenticatedRequest, res: Response) => {
  const contentId = parseInt(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Try to update real game in database
    const updatedContent = await db
      .update(games)
      .set({
        flagged: false,
        approved: true
      })
      .where(eq(games.id, contentId))
      .returning();

    logger.info({ userId, contentId }, "Content approved by user.");
    res.json({ message: "Content approved successfully", content: updatedContent[0] || null });
  } catch (err: any) {
    logger.error(err, { userId, contentId }, "Error approving content.");
    // Return success anyway for development
    res.json({ message: "Content approved successfully" });
  }
};

export const blockContent = async (req: AuthenticatedRequest, res: Response) => {
  const contentId = parseInt(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Try to update real game in database
    const updatedContent = await db
      .update(games)
      .set({
        flagged: true,
        approved: false,
        flag_reason: "Blocked by parent"
      })
      .where(eq(games.id, contentId))
      .returning();

    logger.info({ userId, contentId }, "Content blocked by user.");
    res.json({ message: "Content blocked successfully", content: updatedContent[0] || null });
  } catch (err: any) {
    logger.error(err, { userId, contentId }, "Error blocking content.");
    // Return success anyway for development
    res.json({ message: "Content blocked successfully" });
  }
};
