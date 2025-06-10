import { Request, Response } from "express";
import { db } from "../db/db";
import { games } from "../db/schema";
import { eq } from "drizzle-orm";

export const getFlaggedGames = async (_req: Request, res: Response) => {
  try {
    // Return mock flagged content with better data structure
    const mockFlaggedContent = [
      {
        id: 1,
        name: "Violent Action Game",
        platform: "Steam",
        category: "game",
        flagged: true,
        flag_reason: "Contains excessive violence and mature themes",
      },
      {
        id: 2,
        name: "Inappropriate Video",
        platform: "YouTube",
        category: "video",
        flagged: true,
        flag_reason: "Contains inappropriate language and adult content",
      },
      {
        id: 3,
        name: "Suspicious Website",
        platform: "Web Browser",
        category: "website",
        flagged: true,
        flag_reason: "Blocked for adult content and security concerns",
      },
      {
        id: 4,
        name: "Unknown Mobile App",
        platform: "App Store",
        category: "app",
        flagged: true,
        flag_reason: "Contains occult symbols and unverified content",
      },
    ];

    res.json(mockFlaggedContent);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch flagged games", error: err });
  }
};

export const getAllGames = async (_req: Request, res: Response) => {
  try {
    const allGames = await db.select().from(games);
    res.json(allGames);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch games", error: err });
  }
};

export const createGame = async (req: Request, res: Response) => {
  try {
    const { name, category, flagged } = req.body;
    const [game] = await db
      .insert(games)
      .values({ name, category, flagged: !!flagged })
      .returning();
    res.status(201).json(game);
  } catch (err) {
    res.status(500).json({ message: "Failed to create game", error: err });
  }
};

export const flagGame = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(games)
      .set({ flagged: true })
      .where(eq(games.id, id))
      .returning();
    if (!updated) return res.status(404).json({ message: "Game not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to flag game", error: err });
  }
};

export const approveGame = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(games)
      .set({ flagged: false })
      .where(eq(games.id, id))
      .returning();
    if (!updated) return res.status(404).json({ message: "Game not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to approve game", error: err });
  }
};