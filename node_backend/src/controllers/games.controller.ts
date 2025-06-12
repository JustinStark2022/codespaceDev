import { Request, Response } from "express";
import { db } from "../db/db";
import { games } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const getFlaggedGames = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get flagged games from database
    const flaggedGames = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.flagged, true),
          eq(games.user_id, userId)
        )
      )
      .orderBy(desc(games.created_at));

    // If no flagged games exist, return mock data for demonstration
    if (flaggedGames.length === 0) {
      const mockFlaggedContent = [
        {
          id: 1,
          name: "Violent Action Game",
          platform: "Steam",
          category: "game",
          flagged: true,
          flag_reason: "Contains excessive violence and mature themes",
          user_id: userId,
          approved: false,
          created_at: new Date()
        },
        {
          id: 2,
          name: "Inappropriate Video",
          platform: "YouTube",
          category: "video",
          flagged: true,
          flag_reason: "Contains inappropriate language and adult content",
          user_id: userId,
          approved: false,
          created_at: new Date()
        },
        {
          id: 3,
          name: "Suspicious Website",
          platform: "Web Browser",
          category: "website",
          flagged: true,
          flag_reason: "Blocked for adult content and security concerns",
          user_id: userId,
          approved: false,
          created_at: new Date()
        },
        {
          id: 4,
          name: "Unknown Mobile App",
          platform: "App Store",
          category: "app",
          flagged: true,
          flag_reason: "Contains occult symbols and unverified content",
          user_id: userId,
          approved: false,
          created_at: new Date()
        },
      ];

      return res.json(mockFlaggedContent);
    }

    res.json(flaggedGames);
  } catch (err) {
    console.error("Error fetching flagged games:", err);
    res.status(500).json({ message: "Failed to fetch flagged games", error: err });
  }
};

export const getAllGames = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const allGames = await db
      .select()
      .from(games)
      .where(eq(games.user_id, userId))
      .orderBy(desc(games.created_at));

    res.json(allGames);
  } catch (err) {
    console.error("Error fetching games:", err);
    res.status(500).json({ message: "Failed to fetch games", error: err });
  }
};

export const createGame = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, platform, category, flagged, flag_reason } = req.body;
    const [game] = await db
      .insert(games)
      .values({
        name,
        platform,
        category,
        flagged: !!flagged,
        flag_reason,
        user_id: userId
      })
      .returning();

    res.status(201).json(game);
  } catch (err) {
    console.error("Error creating game:", err);
    res.status(500).json({ message: "Failed to create game", error: err });
  }
};

export const flagGame = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = parseInt(req.params.id);
    const { flag_reason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [updated] = await db
      .update(games)
      .set({
        flagged: true,
        approved: false,
        flag_reason: flag_reason || "Flagged by parent"
      })
      .where(
        and(
          eq(games.id, id),
          eq(games.user_id, userId)
        )
      )
      .returning();

    if (!updated) return res.status(404).json({ message: "Game not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error flagging game:", err);
    res.status(500).json({ message: "Failed to flag game", error: err });
  }
};

export const approveGame = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [updated] = await db
      .update(games)
      .set({
        flagged: false,
        approved: true,
        flag_reason: null
      })
      .where(
        and(
          eq(games.id, id),
          eq(games.user_id, userId)
        )
      )
      .returning();

    if (!updated) return res.status(404).json({ message: "Game not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error approving game:", err);
    res.status(500).json({ message: "Failed to approve game", error: err });
  }
};