import { apiRequest } from "@/lib/queryClient";

export interface FlaggedContent {
  id: number;
  name: string;
  platform: string;
  flagReason: string;
  contentType: string;
  category?: string;
  flagged: boolean;
}

export const getFlaggedContent = async (): Promise<FlaggedContent[]> => {
  const res = await apiRequest("GET", "/api/games/flagged");
  const games = await res.json();
  
  // Transform games data to match FlaggedContent interface
  return games.map((game: any) => ({
    id: game.id,
    name: game.name,
    platform: game.platform || "Unknown",
    flagReason: game.flag_reason || "Content flagged for review",
    contentType: game.category || "game",
    category: game.category,
    flagged: game.flagged
  }));
};