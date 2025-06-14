import { apiRequest } from "@/lib/queryClient";

export interface FlaggedContent {
  id: number;
  name: string;
  platform: string;
  contentType: 'game' | 'video' | 'website' | 'app';
  flagReason: string;
  flaggedAt: string;
}

export const getFlaggedContent = async (): Promise<FlaggedContent[]> => {
  const res = await fetch("/api/games/flagged", {
    credentials: "include",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch flagged content");
  }

  return res.json();
};