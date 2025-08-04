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
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { InferModel } from "drizzle-orm";

// ─── Users ──────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  display_name: varchar("display_name", { length: 255 }).notNull(),
  role: text("role").notNull().default("child"),
  parent_id: integer("parent_id").references(
    (): AnyPgColumn => users.id,
    { onDelete: "cascade" }
  ),
  first_name: varchar("first_name", { length: 255 }).notNull().default(""),
  last_name: varchar("last_name", { length: 255 }).notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ─── Devotionals ───────────────────────────────────────────────────────────────
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

// ─── Lesson Progress ──────────────────────────────────────────────────────────
export const lesson_progress = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
  lesson_id: integer("lesson_id")
    .notNull()
    .references((): AnyPgColumn => lessons.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  completed_at: timestamp("completed_at"),
});

// ─── Child Activity Logs ───────────────────────────────────────────────────────
export const child_activity_logs = pgTable("child_activity_logs", {
  id: serial("id").primaryKey(),
  child_id: integer("child_id")
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
  activity_type: varchar("activity_type", { length: 50 }).notNull(),
  activity_name: varchar("activity_name", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 50 }),
  duration_minutes: integer("duration_minutes"),
  content_category: varchar("content_category", { length: 50 }),
  content_rating: varchar("content_rating", { length: 10 }),
  flagged: boolean("flagged").default(false),
  flag_reason: varchar("flag_reason", { length: 255 }),
  ai_analysis: text("ai_analysis"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// ─── Content Analysis ───────────────────────────────────────────────────────────
export const content_analysis = pgTable("content_analysis", {
  id: serial("id").primaryKey(),
  child_id: integer("child_id")
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
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

// ─── Weekly Summaries ──────────────────────────────────────────────────────────
export const weekly_content_summaries = pgTable("weekly_content_summaries", {
  id: serial("id").primaryKey(),
  family_id: integer("family_id")
    .notNull()
    .references((): AnyPgColumn => users.id),
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

// ─── LLM Generated Content ─────────────────────────────────────────────────────
export const llm_generated_content = pgTable("llm_generated_content", {
  id: serial("id").primaryKey(),
  content_type: varchar("content_type", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  system_prompt: text("system_prompt"),
  generated_content: text("generated_content").notNull(),
  user_id: integer("user_id").references((): AnyPgColumn => users.id),
  child_id: integer("child_id").references((): AnyPgColumn => users.id),
  context: varchar("context", { length: 100 }),
  tokens_used: integer("tokens_used"),
  generation_time_ms: integer("generation_time_ms"),
  quality_rating: integer("quality_rating"),
  reviewed: boolean("reviewed").default(false),
  approved: boolean("approved").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── Content Monitoring ────────────────────────────────────────────────────────
export const content_monitoring = pgTable("content_monitoring", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
  parent_id: integer("parent_id")
    .notNull()
    .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
  content_type: varchar("content_type", { length: 50 }).notNull(),
  content_source: varchar("content_source", { length: 255 }),
  content_snippet: text("content_snippet").notNull(),
  analysis_result: text("analysis_result").notNull(),
  safety_level: varchar("safety_level", { length: 20 }).notNull(),
  flagged: boolean("flagged").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

// ─── Infer Types ────────────────────────────────────────────────────────────────
export type User = InferModel<typeof users>;
export type NewUser = InferModel<typeof users, "insert">;
export type Devotional = InferModel<typeof devotionals>;
export type Lesson = InferModel<typeof lessons>;
export type LessonProgress = InferModel<typeof lesson_progress>;
export type ActivityLog = InferModel<typeof child_activity_logs>;
export type ContentAnalysis = InferModel<typeof content_analysis>;
export type WeeklySummary = InferModel<typeof weekly_content_summaries>;
export type LLMGenerated = InferModel<typeof llm_generated_content>;
export type ContentMonitoring = InferModel<typeof content_monitoring>;
