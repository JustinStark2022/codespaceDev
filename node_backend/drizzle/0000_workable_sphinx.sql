CREATE TABLE "child_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"activity_name" varchar(255) NOT NULL,
	"platform" varchar(50),
	"duration_minutes" integer,
	"content_category" varchar(50),
	"content_rating" varchar(10),
	"flagged" boolean DEFAULT false,
	"flag_reason" varchar(255),
	"ai_analysis" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"content_name" varchar(255) NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"platform" varchar(50),
	"url" text,
	"ai_analysis" text NOT NULL,
	"safety_score" integer,
	"content_themes" text,
	"recommended_age" varchar(20),
	"parent_guidance_needed" boolean DEFAULT false,
	"guidance_notes" text,
	"reviewed_by_parent" boolean DEFAULT false,
	"approved" boolean,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_monitoring" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"parent_id" integer NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"content_source" varchar(255),
	"content_snippet" text NOT NULL,
	"analysis_result" text NOT NULL,
	"safety_level" varchar(20) NOT NULL,
	"flagged" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devotionals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"verse" text NOT NULL,
	"reference" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"date" date NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lesson_id" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"verse_ref" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"age_range" varchar(50) NOT NULL,
	"scripture_references" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_generated_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"prompt" text NOT NULL,
	"system_prompt" text,
	"generated_content" text NOT NULL,
	"user_id" integer,
	"child_id" integer,
	"context" varchar(100),
	"tokens_used" integer,
	"generation_time_ms" integer,
	"quality_rating" integer,
	"reviewed" boolean DEFAULT false,
	"approved" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "screen_time" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"allowed_time_minutes" integer DEFAULT 120 NOT NULL,
	"used_time_minutes" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"role" text DEFAULT 'child' NOT NULL,
	"parent_id" integer,
	"first_name" varchar(255) DEFAULT '' NOT NULL,
	"last_name" varchar(255) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weekly_content_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"summary_content" text NOT NULL,
	"parental_advice" text NOT NULL,
	"discussion_topics" text,
	"spiritual_guidance" text NOT NULL,
	"concerning_content" text,
	"positive_highlights" text,
	"recommended_actions" text,
	"prayer_suggestions" text,
	"generated_at" timestamp DEFAULT now(),
	"reviewed" boolean DEFAULT false,
	"sent_to_parent" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "child_activity_logs" ADD CONSTRAINT "child_activity_logs_child_id_users_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_analysis" ADD CONSTRAINT "content_analysis_child_id_users_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_monitoring" ADD CONSTRAINT "content_monitoring_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_monitoring" ADD CONSTRAINT "content_monitoring_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_generated_content" ADD CONSTRAINT "llm_generated_content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_generated_content" ADD CONSTRAINT "llm_generated_content_child_id_users_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_time" ADD CONSTRAINT "screen_time_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_content_summaries" ADD CONSTRAINT "weekly_content_summaries_family_id_users_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;