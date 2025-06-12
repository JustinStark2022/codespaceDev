// src/db/schema.ts
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  time,
  boolean,
} from "drizzle-orm/pg-core";
import { InferModel } from "drizzle-orm";

// ─── Users ──────────────────────────────────────────────────────────────────────
export const users: any = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  display_name: varchar("display_name", { length: 255 }).notNull(),
  role: text("role").notNull().default("child"), // "parent" or "child"
  parent_id: integer("parent_id")
    .references(() => users.id, { onDelete: "cascade" }),
  first_name: varchar("first_name", { length: 255 }).notNull().default(""),
  last_name: varchar("last_name", { length: 255 }).notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ─── Lessons ───────────────────────────────────────────────────────────────────
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  verse_ref: varchar("verse_ref", { length: 255 }).notNull(),
  content: text("content").notNull(),
  age_range: varchar("age_range", { length: 50 }).notNull(),
  scripture_references: text("scripture_references").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ─── Lesson Progress ───────────────────────────────────────────────────────────
export const lesson_progress = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lesson_id: integer("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  completed_at: timestamp("completed_at"),
});

// ─── Screen Time ───────────────────────────────────────────────────────────────
export const screen_time = pgTable("screen_time", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  daily_limits_total: integer("daily_limits_total").notNull(),
  daily_limits_gaming: integer("daily_limits_gaming").notNull(),
  daily_limits_social: integer("daily_limits_social").notNull(),
  daily_limits_educational: integer("daily_limits_educational").notNull(),
  usage_today_total: integer("usage_today_total").notNull(),
  usage_today_gaming: integer("usage_today_gaming").notNull(),
  usage_today_social: integer("usage_today_social").notNull(),
  usage_today_educational: integer("usage_today_educational").notNull(),
  time_rewards_scripture: integer("time_rewards_scripture").notNull(),
  time_rewards_lessons: integer("time_rewards_lessons").notNull(),
  time_rewards_chores: integer("time_rewards_chores").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ─── Schedules ─────────────────────────────────────────────────────────────────
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  day_of_week: varchar("day_of_week", { length: 10 }).notNull(),
  start_time: time("start_time").notNull(),
  end_time: time("end_time").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

// ─── Blocked Apps ─────────────────────────────────────────────────────────────
export const blocked_apps = pgTable("blocked_apps", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  category: text("category").notNull(), // e.g. "gaming", "social", etc.
  blocked: boolean("blocked").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ─── Devotionals ───────────────────────────────────────────────────────────────
export const devotionals = pgTable("devotionals", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  verse: text("verse").notNull(),
  reference: varchar("reference", { length: 255 }).notNull(),
  content: text("content").notNull(),
  date: timestamp("date", { mode: "date" }).notNull(),
  image: text("image"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ─── Games ───────────────────────────────────────────────────────────────────
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 100 }),
  category: varchar("category", { length: 100 }),
  flagged: boolean("flagged").notNull().default(false),
  flag_reason: text("flag_reason"),
  approved: boolean("approved").notNull().default(false),
  user_id: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ─── User Settings ─────────────────────────────────────────────────────────
export const user_settings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // General Settings
  content_alerts: boolean("content_alerts").notNull().default(true),
  screentime_alerts: boolean("screentime_alerts").notNull().default(true),
  lesson_completions: boolean("lesson_completions").notNull().default(true),
  device_usage: boolean("device_usage").notNull().default(true),
  bible_plan: boolean("bible_plan").notNull().default(true),
  // Bible Settings
  default_translation: varchar("default_translation", { length: 10 }).notNull().default("NIV"),
  reading_plan: varchar("reading_plan", { length: 50 }).notNull().default("chronological"),
  daily_reminders: boolean("daily_reminders").notNull().default(true),
  // App Preferences
  theme_mode: varchar("theme_mode", { length: 10 }).notNull().default("light"),
  language: varchar("language", { length: 5 }).notNull().default("en"),
  sound_effects: boolean("sound_effects").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Content Filters ───────────────────────────────────────────────────────
export const content_filters = pgTable("content_filters", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  child_id: integer("child_id").references(() => users.id, { onDelete: "cascade" }),
  block_violence: boolean("block_violence").notNull().default(true),
  block_language: boolean("block_language").notNull().default(true),
  block_occult: boolean("block_occult").notNull().default(true),
  block_bullying: boolean("block_bullying").notNull().default(true),
  block_sexual: boolean("block_sexual").notNull().default(true),
  block_blasphemy: boolean("block_blasphemy").notNull().default(true),
  filter_sensitivity: integer("filter_sensitivity").notNull().default(7),
  ai_detection_mode: varchar("ai_detection_mode", { length: 20 }).notNull().default("balanced"),
  realtime_scanning: boolean("realtime_scanning").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Screen Time Settings ──────────────────────────────────────────────────
export const screen_time_settings = pgTable("screen_time_settings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  child_id: integer("child_id").references(() => users.id, { onDelete: "cascade" }),
  weekday_limit: integer("weekday_limit").notNull().default(120),
  weekend_limit: integer("weekend_limit").notNull().default(180),
  sleep_time: time("sleep_time").notNull().default("21:00"),
  wake_time: time("wake_time").notNull().default("07:00"),
  break_interval: integer("break_interval").notNull().default(30),
  break_duration: integer("break_duration").notNull().default(5),
  lock_after_bedtime: boolean("lock_after_bedtime").notNull().default(true),
  pause_during_bedtime: boolean("pause_during_bedtime").notNull().default(true),
  location_based_rules: boolean("location_based_rules").notNull().default(true),
  emergency_override: boolean("emergency_override").notNull().default(true),
  allow_rewards: boolean("allow_rewards").notNull().default(true),
  max_reward_time: integer("max_reward_time").notNull().default(60),
  reward_per_lesson: integer("reward_per_lesson").notNull().default(15),
  weekend_bonus: boolean("weekend_bonus").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Trusted Websites ──────────────────────────────────────────────────────
export const trusted_websites = pgTable("trusted_websites", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  child_id: integer("child_id").references(() => users.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ─── Monitoring Settings ───────────────────────────────────────────────────
export const monitoring_settings = pgTable("monitoring_settings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  live_activity_feed: boolean("live_activity_feed").notNull().default(true),
  screenshot_monitoring: boolean("screenshot_monitoring").notNull().default(false),
  keystroke_logging: boolean("keystroke_logging").notNull().default(false),
  monitoring_frequency: varchar("monitoring_frequency", { length: 10 }).notNull().default("medium"),
  instant_alerts: boolean("instant_alerts").notNull().default(true),
  daily_summary: boolean("daily_summary").notNull().default(true),
  weekly_reports: boolean("weekly_reports").notNull().default(true),
  alert_threshold: varchar("alert_threshold", { length: 10 }).notNull().default("medium"),
  data_retention: integer("data_retention").notNull().default(90),
  anonymous_analytics: boolean("anonymous_analytics").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export type User = InferModel<typeof users>;
export type NewUser = InferModel<typeof users, "insert">;
export type UserSettings = InferModel<typeof user_settings>;
export type NewUserSettings = InferModel<typeof user_settings, "insert">;
export type ContentFilters = InferModel<typeof content_filters>;
export type NewContentFilters = InferModel<typeof content_filters, "insert">;
export type ScreenTimeSettings = InferModel<typeof screen_time_settings>;
export type NewScreenTimeSettings = InferModel<typeof screen_time_settings, "insert">;
export type TrustedWebsite = InferModel<typeof trusted_websites>;
export type NewTrustedWebsite = InferModel<typeof trusted_websites, "insert">;
export type MonitoringSettings = InferModel<typeof monitoring_settings>;
export type NewMonitoringSettings = InferModel<typeof monitoring_settings, "insert">;
export type Game = InferModel<typeof games>;
export type NewGame = InferModel<typeof games, "insert">;