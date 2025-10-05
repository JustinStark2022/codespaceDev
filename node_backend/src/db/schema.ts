// src/db/schema.ts
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  date,
  boolean,
  time,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

/* ─── Users ─────────────────────────────────────────────────────────────────── */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),        // now NOT NULL
  password: varchar("password", { length: 255 }).notNull(),
  display_name: varchar("display_name", { length: 255 }).notNull(),   // added to match schema
  role: text("role").notNull().default("child"),
  parent_id: integer("parent_id").references((): AnyPgColumn => users.id, {
    onDelete: "cascade",
  }),

  // legacy columns that exist in your DB and should be kept
  age: integer("age"),
  profile_picture: text("profile_picture"),
  

  first_name: varchar("first_name", { length: 255 }).notNull().default(""),
  last_name: varchar("last_name", { length: 255 }).notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

/* ─── Devotionals ───────────────────────────────────────────────────────────── */
export const devotionals = pgTable("devotionals", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  verse: text("verse").notNull(),
  reference: varchar("reference", { length: 255 }).notNull(),
  content: text("content").notNull(),
  date: date("date", { mode: "date" }).notNull(),
  image: text("image"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

/* ─── Lessons ───────────────────────────────────────────────────────────────── */
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  verse_ref: varchar("verse_ref", { length: 255 }).notNull(),
  content: text("content").notNull(),
  age_range: varchar("age_range", { length: 50 }).notNull(),
  scripture_references: text("scripture_references").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

/* ─── Lesson Progress ───────────────────────────────────────────────────────── */
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

/* ─── Screen Time (keep legacy cols + your new ones) ────────────────────────── */
export const screen_time = pgTable("screen_time", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // your desired fields
  allowed_time_minutes: integer("allowed_time_minutes").notNull().default(120),
  used_time_minutes: integer("used_time_minutes").notNull().default(0),
  updated_at: timestamp("updated_at").notNull().defaultNow(),

  // legacy fields already present in DB
  daily_limits_total: integer("daily_limits_total"),
  daily_limits_gaming: integer("daily_limits_gaming"),
  daily_limits_social: integer("daily_limits_social"),
  daily_limits_educational: integer("daily_limits_educational"),
  created_at: timestamp("created_at").defaultNow(),
  usage_today_total: integer("usage_today_total"),
  usage_today_gaming: integer("usage_today_gaming"),
  usage_today_social: integer("usage_today_social"),
  usage_today_educational: integer("usage_today_educational"),
  time_rewards_scripture: integer("time_rewards_scripture"),
  time_rewards_lessons: integer("time_rewards_lessons"),
  time_rewards_chores: integer("time_rewards_chores"),
});

/* ─── Child Activity Logs ───────────────────────────────────────────────────── */
export const child_activity_logs = pgTable("child_activity_logs", {
  id: serial("id").primaryKey(),
  child_id: integer("child_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  activity_type: varchar("activity_type", { length: 50 }).notNull(),
  activity_name: varchar("activity_name", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 50 }),
  duration_minutes: integer("duration_minutes"),
  content_category: varchar("content_category", { length: 50 }),
  content_rating: varchar("content_rating", { length: 10 }),
  flagged: boolean("flagged").default(false),
  flag_reason: varchar("flag_reason", { length: 255 }),
  ai_analysis: text("ai_analysis"),
  // Note: column name "timestamp" is allowed, but consider renaming if confusing.
  timestamp: timestamp("timestamp").defaultNow(),
});

/* ─── Content Analysis ──────────────────────────────────────────────────────── */
export const content_analysis = pgTable("content_analysis", {
  id: serial("id").primaryKey(),
  child_id: integer("child_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content_name: varchar("content_name", { length: 255 }).notNull(),
  content_type: varchar("content_type", { length: 50 }).notNull(),
  platform: varchar("platform", { length: 50 }),
  url: text("url"),
  ai_analysis: text("ai_analysis").notNull(),
  safety_score: integer("safety_score"),
  content_themes: text("content_themes"),
  recommended_age: varchar("recommended_age", { length: 20 }),
  parent_guidance_needed: boolean("parent_guidance_needed").default(false),
  guidance_notes: text("guidance_notes"),
  reviewed_by_parent: boolean("reviewed_by_parent").default(false),
  approved: boolean("approved"),
  created_at: timestamp("created_at").defaultNow(),
});

/* ─── Weekly Summaries ──────────────────────────────────────────────────────── */
export const weekly_content_summaries = pgTable("weekly_content_summaries", {
  id: serial("id").primaryKey(),
  family_id: integer("family_id")
    .notNull()
    .references(() => users.id),
  week_start_date: date("week_start_date", { mode: "date" }).notNull(),
  week_end_date: date("week_end_date", { mode: "date" }).notNull(),
  summary_content: text("summary_content").notNull(),
  parental_advice: text("parental_advice").notNull(),
  discussion_topics: text("discussion_topics"),
  spiritual_guidance: text("spiritual_guidance").notNull(),
  concerning_content: text("concerning_content"),
  positive_highlights: text("positive_highlights"),
  recommended_actions: text("recommended_actions"),
  prayer_suggestions: text("prayer_suggestions"),
  generated_at: timestamp("generated_at").defaultNow(),
  reviewed: boolean("reviewed").default(false),
  sent_to_parent: boolean("sent_to_parent").default(false),
});

/* ─── LLM Generated Content ─────────────────────────────────────────────────── */
export const llm_generated_content = pgTable("llm_generated_content", {
  id: serial("id").primaryKey(),
  content_type: varchar("content_type", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  system_prompt: text("system_prompt"),
  generated_content: text("generated_content").notNull(),
  user_id: integer("user_id").references(() => users.id),
  child_id: integer("child_id").references(() => users.id),
  context: varchar("context", { length: 100 }),
  tokens_used: integer("tokens_used"),
  generation_time_ms: integer("generation_time_ms"),
  quality_rating: integer("quality_rating"),
  reviewed: boolean("reviewed").default(false),
  approved: boolean("approved").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

/* ─── Content Monitoring ────────────────────────────────────────────────────── */
export const content_monitoring = pgTable("content_monitoring", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parent_id: integer("parent_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content_type: varchar("content_type", { length: 50 }).notNull(),
  content_source: varchar("content_source", { length: 255 }),
  content_snippet: text("content_snippet").notNull(),
  analysis_result: text("analysis_result").notNull(),
  safety_level: varchar("safety_level", { length: 20 }).notNull(),
  flagged: boolean("flagged").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

/* ─── Blocked Apps ──────────────────────────────────────────────────────────── */
export const blocked_apps = pgTable("blocked_apps", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  category: text("category").notNull(),
  blocked: boolean("blocked").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ─── Website History ───────────────────────────────────────────────────────── */
export const website_history = pgTable("website_history", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: varchar("title", { length: 255 }),
  visited_at: timestamp("visited_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ─── Video History ─────────────────────────────────────────────────────────── */
export const video_history = pgTable("video_history", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  video_url: text("video_url").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  watched_at: timestamp("watched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ─── Games ─────────────────────────────────────────────────────────────────── */
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }),
  flagged: boolean("flagged").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ─── Game History ──────────────────────────────────────────────────────────── */
export const game_history = pgTable("game_history", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  game_id: integer("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  played_at: timestamp("played_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ─── Schedules ─────────────────────────────────────────────────────────────── */
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  day_of_week: varchar("day_of_week", { length: 20 }).notNull(),
  // Your DB shows TIME WITHOUT TIME ZONE, so use `time()` here
  start_time: time("start_time").notNull(),
  end_time: time("end_time").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

/* ─── Content Filter Settings ───────────────────────────────────────────────── */
export const content_filter_settings = pgTable("content_filter_settings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  block_secular: boolean("block_secular").notNull().default(false),
  block_inappropriate: boolean("block_inappropriate").notNull().default(true),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ─── Daily Verses ──────────────────────────────────────────────────────────── */
export const dailyVerses = pgTable("daily_verses", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),          // YYYY-MM-DD (UTC)
  reference: text("reference").notNull(),
  verseText: text("verse_text").notNull(),
  reflection: text("reflection"),
  prayer: text("prayer"),
  rawResponse: text("raw_response"),
  tokensUsed: integer("tokens_used"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),

  generatedByUserId: integer("generated_by_user_id").references(() => users.id)
});

/* ─── Infer Types ───────────────────────────────────────────────────────────── */
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Devotional = InferSelectModel<typeof devotionals>;
export type Lesson = InferSelectModel<typeof lessons>;
export type LessonProgress = InferSelectModel<typeof lesson_progress>;

export type ScreenTime = InferSelectModel<typeof screen_time>;
export type ActivityLog = InferSelectModel<typeof child_activity_logs>;
export type ContentAnalysis = InferSelectModel<typeof content_analysis>;
export type WeeklySummary = InferSelectModel<typeof weekly_content_summaries>;
export type LLMGenerated = InferSelectModel<typeof llm_generated_content>;
export type ContentMonitoring = InferSelectModel<typeof content_monitoring>;

export type BlockedApp = InferSelectModel<typeof blocked_apps>;
export type WebsiteHistory = InferSelectModel<typeof website_history>;
export type VideoHistory = InferSelectModel<typeof video_history>;
export type Game = InferSelectModel<typeof games>;
export type GameHistory = InferSelectModel<typeof game_history>;
export type Schedule = InferSelectModel<typeof schedules>;
export type ContentFilterSettings = InferSelectModel<typeof content_filter_settings>;
export type DailyVerse = InferSelectModel<typeof dailyVerses>;
