// @/types/screenTime.ts
import { User } from "@/types/user";

export interface ScreenTimeData {
  allowedTimeMinutes: number;
  usedTimeMinutes: number;
  additionalRewardMinutes: number;
  dailyLimits: {
    total: number;
    gaming: number;
    social: number;
    educational: number;
  };
  usageToday: {
    total: number;
    gaming: number;
    social: number;
    educational: number;
  };
  timeRewards: {
    fromScripture: number;
    fromLessons: number;
    fromChores: number;
  };
}