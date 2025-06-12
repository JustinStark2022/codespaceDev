import { apiRequest } from "@/lib/queryClient";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UserSettings {
  id: number;
  user_id: number;
  content_alerts: boolean;
  screentime_alerts: boolean;
  lesson_completions: boolean;
  device_usage: boolean;
  bible_plan: boolean;
  default_translation: string;
  reading_plan: string;
  daily_reminders: boolean;
  theme_mode: string;
  language: string;
  sound_effects: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentFilters {
  id: number;
  user_id: number;
  child_id?: number;
  block_violence: boolean;
  block_language: boolean;
  block_occult: boolean;
  block_bullying: boolean;
  block_sexual: boolean;
  block_blasphemy: boolean;
  filter_sensitivity: number;
  ai_detection_mode: string;
  realtime_scanning: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScreenTimeSettings {
  id: number;
  user_id: number;
  child_id?: number;
  weekday_limit: number;
  weekend_limit: number;
  sleep_time: string;
  wake_time: string;
  break_interval: number;
  break_duration: number;
  lock_after_bedtime: boolean;
  pause_during_bedtime: boolean;
  location_based_rules: boolean;
  emergency_override: boolean;
  allow_rewards: boolean;
  max_reward_time: number;
  reward_per_lesson: number;
  weekend_bonus: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonitoringSettings {
  id: number;
  user_id: number;
  live_activity_feed: boolean;
  screenshot_monitoring: boolean;
  keystroke_logging: boolean;
  monitoring_frequency: string;
  instant_alerts: boolean;
  daily_summary: boolean;
  weekly_reports: boolean;
  alert_threshold: string;
  data_retention: number;
  anonymous_analytics: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrustedWebsite {
  id: number;
  user_id: number;
  child_id?: number;
  url: string;
  name?: string;
  created_at: string;
}

// ─── General Settings ──────────────────────────────────────────────────────

export const getUserSettings = async (): Promise<UserSettings> => {
  const res = await apiRequest("GET", "/api/settings/general");
  return res.json();
};

export const updateUserSettings = async (settings: Partial<UserSettings>): Promise<UserSettings> => {
  const res = await apiRequest("PUT", "/api/settings/general", settings);
  return res.json();
};

// ─── Content Filters ───────────────────────────────────────────────────────

export const getContentFilters = async (childId?: number): Promise<ContentFilters> => {
  const url = childId ? `/api/settings/content-filters?childId=${childId}` : "/api/settings/content-filters";
  const res = await apiRequest("GET", url);
  return res.json();
};

export const updateContentFilters = async (filters: Partial<ContentFilters>): Promise<ContentFilters> => {
  const res = await apiRequest("PUT", "/api/settings/content-filters", filters);
  return res.json();
};

// ─── Screen Time Settings ──────────────────────────────────────────────────

export const getScreenTimeSettings = async (childId?: number): Promise<ScreenTimeSettings> => {
  const url = childId ? `/api/settings/screen-time?childId=${childId}` : "/api/settings/screen-time";
  const res = await apiRequest("GET", url);
  return res.json();
};

export const updateScreenTimeSettings = async (settings: Partial<ScreenTimeSettings>): Promise<ScreenTimeSettings> => {
  const res = await apiRequest("PUT", "/api/settings/screen-time", settings);
  return res.json();
};

// ─── Monitoring Settings ───────────────────────────────────────────────────

export const getMonitoringSettings = async (): Promise<MonitoringSettings> => {
  const res = await apiRequest("GET", "/api/settings/monitoring");
  return res.json();
};

export const updateMonitoringSettings = async (settings: Partial<MonitoringSettings>): Promise<MonitoringSettings> => {
  const res = await apiRequest("PUT", "/api/settings/monitoring", settings);
  return res.json();
};

// ─── Trusted Websites ──────────────────────────────────────────────────────

export const getTrustedWebsites = async (childId?: number): Promise<TrustedWebsite[]> => {
  const url = childId ? `/api/settings/trusted-websites?childId=${childId}` : "/api/settings/trusted-websites";
  const res = await apiRequest("GET", url);
  return res.json();
};

export const addTrustedWebsite = async (website: {
  url: string;
  name?: string;
  childId?: number;
}): Promise<TrustedWebsite> => {
  const res = await apiRequest("POST", "/api/settings/trusted-websites", website);
  return res.json();
};

export const removeTrustedWebsite = async (id: number): Promise<void> => {
  await apiRequest("DELETE", `/api/settings/trusted-websites/${id}`);
};
