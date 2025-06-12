import { apiRequest } from "@/lib/queryClient";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OverviewData {
  screenTime: {
    allowedTimeMinutes: number;
    usedTimeMinutes: number;
    additionalRewardMinutes: number;
  };
  flaggedContentCount: number;
  recentActivity: Array<{
    date: string;
    usedTime: number;
    allowedTime: number;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export interface ContentItem {
  id: number;
  name: string;
  platform: string;
  category: string;
  flagged: boolean;
  flag_reason?: string;
  approved: boolean;
  user_id: number;
  created_at: string;
}

export interface WeeklyReport {
  period: {
    start: string;
    end: string;
  };
  totalScreenTime: number;
  averageDaily: number;
  dailyBreakdown: Array<{
    date: string;
    screenTime: number;
    allowedTime: number;
  }>;
  generatedAt: string;
}

export interface ContentSafetySummary {
  flaggedItems: number;
  approvedItems: number;
  totalReviewed: number;
  recentFlags: Array<{
    name: string;
    platform: string;
    reason: string;
    date: string;
  }>;
  generatedAt: string;
}

// ─── Overview ──────────────────────────────────────────────────────────────

export const getOverviewData = async (childId?: number, date?: string): Promise<OverviewData> => {
  const params = new URLSearchParams();
  if (childId) params.append("childId", childId.toString());
  if (date) params.append("date", date);
  
  const url = `/api/parental-control/overview${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await apiRequest("GET", url);
  return res.json();
};

// ─── Content Management ────────────────────────────────────────────────────

export const getFlaggedContent = async (childId?: number): Promise<ContentItem[]> => {
  const url = childId 
    ? `/api/parental-control/flagged-content?childId=${childId}` 
    : "/api/parental-control/flagged-content";
  const res = await apiRequest("GET", url);
  return res.json();
};

export const approveContent = async (contentId: number): Promise<{ message: string; content: ContentItem }> => {
  const res = await apiRequest("PUT", `/api/parental-control/content/${contentId}/approve`);
  return res.json();
};

export const blockContent = async (contentId: number): Promise<{ message: string; content: ContentItem }> => {
  const res = await apiRequest("PUT", `/api/parental-control/content/${contentId}/block`);
  return res.json();
};

// ─── Quick Actions ─────────────────────────────────────────────────────────

export const addTrustedWebsiteQuick = async (data: {
  url: string;
  name?: string;
  childId?: number;
}): Promise<{ message: string; website: any }> => {
  const res = await apiRequest("POST", "/api/parental-control/trusted-website", data);
  return res.json();
};

export const blockNewApp = async (data: {
  name: string;
  platform?: string;
  childId?: number;
}): Promise<{ message: string; app: any }> => {
  const res = await apiRequest("POST", "/api/parental-control/block-app", data);
  return res.json();
};

export const syncContentRules = async (): Promise<{ 
  message: string; 
  syncedAt: string; 
  rulesCount: number; 
}> => {
  const res = await apiRequest("POST", "/api/parental-control/sync-rules");
  return res.json();
};

// ─── Reports ───────────────────────────────────────────────────────────────

export const generateWeeklyReport = async (childId?: number): Promise<WeeklyReport> => {
  const url = childId 
    ? `/api/parental-control/reports/weekly?childId=${childId}` 
    : "/api/parental-control/reports/weekly";
  const res = await apiRequest("GET", url);
  return res.json();
};

export const generateContentSafetySummary = async (childId?: number): Promise<ContentSafetySummary> => {
  const url = childId 
    ? `/api/parental-control/reports/content-safety?childId=${childId}` 
    : "/api/parental-control/reports/content-safety";
  const res = await apiRequest("GET", url);
  return res.json();
};
