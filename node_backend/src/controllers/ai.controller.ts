import { Request, Response } from "express";

// Dummy AI analysis logic
export const analyzeGame = async (req: Request, res: Response) => {
  const { name, platform, description } = req.body;

  // Example: flag if description contains "violence" or "adult"
  let flagged = false;
  let flagReason = "";
  if (description && /(violence|adult|occult|gambling)/i.test(description)) {
    flagged = true;
    flagReason = "Content flagged for sensitive keywords.";
  }

  res.json({
    name,
    platform,
    flagged,
    flagReason: flagged ? flagReason : null,
  });
};
