import { drizzle } from 'drizzle-orm/node-postgres';

/**
 * Creates LLM + activity + analysis + summary + conversation tables
 * with FKs, enums/checks, and practical indexes.
 */
export async function up(db: any) {
  await db.execute(`
    -- Optionally enumerate known content types; otherwise keep free-form varchar
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type_enum') THEN
        CREATE TYPE content_type_enum AS ENUM (
          'devotional', 'lesson', 'verse_of_day', 'summary', 'monitoring', 'other'
        );
      END IF;
    END $$;

    -- 1) LLM generated content
    CREATE TABLE IF NOT EXISTS llm_generated_content (
      id                 SERIAL PRIMARY KEY,
      content_type       content_type_enum NOT NULL,
      prompt             TEXT NOT NULL,
      system_prompt      TEXT,
      generated_content  TEXT NOT NULL,
      user_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
      child_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
      context            VARCHAR(100),
      tokens_used        INTEGER,
      generation_time_ms INTEGER,
      quality_rating     INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
      reviewed           BOOLEAN NOT NULL DEFAULT FALSE,
      approved           BOOLEAN NOT NULL DEFAULT TRUE,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_llm_type_created
      ON llm_generated_content (content_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_llm_user
      ON llm_generated_content (user_id);
    CREATE INDEX IF NOT EXISTS idx_llm_child
      ON llm_generated_content (child_id);

    -- 2) Child activity logs
    CREATE TABLE IF NOT EXISTS child_activity_logs (
      id                SERIAL PRIMARY KEY,
      child_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      activity_type     VARCHAR(50) NOT NULL,     -- e.g., 'game', 'video', 'chat'
      activity_name     VARCHAR(255) NOT NULL,
      platform          VARCHAR(50),              -- e.g., 'Roblox', 'YouTube'
      duration_minutes  INTEGER CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
      content_category  VARCHAR(50),
      content_rating    VARCHAR(10),              -- e.g., 'E10', 'T', 'M', 'G', 'PG'
      flagged           BOOLEAN NOT NULL DEFAULT FALSE,
      flag_reason       VARCHAR(255),
      ai_analysis       TEXT,
      timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_act_child_ts
      ON child_activity_logs (child_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_act_flagged
      ON child_activity_logs (flagged);

    -- 3) Content analysis (per-content verdicts)
    CREATE TABLE IF NOT EXISTS content_analysis (
      id                    SERIAL PRIMARY KEY,
      child_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_name          VARCHAR(255) NOT NULL,
      content_type          VARCHAR(50) NOT NULL,
      platform              VARCHAR(50),
      url                   TEXT,
      ai_analysis           TEXT NOT NULL,
      safety_score          INTEGER CHECK (safety_score BETWEEN 0 AND 100),
      content_themes        TEXT,
      recommended_age       VARCHAR(20),
      parent_guidance_needed BOOLEAN NOT NULL DEFAULT FALSE,
      guidance_notes        TEXT,
      reviewed_by_parent    BOOLEAN NOT NULL DEFAULT FALSE,
      approved              BOOLEAN,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ca_child_created
      ON content_analysis (child_id, created_at DESC);

    -- 4) Weekly content summaries (per-family)
    CREATE TABLE IF NOT EXISTS weekly_content_summaries (
      id                   SERIAL PRIMARY KEY,
      family_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_start_date      DATE NOT NULL,
      week_end_date        DATE NOT NULL,
      summary_content      TEXT NOT NULL,
      parental_advice      TEXT NOT NULL,
      discussion_topics    TEXT,
      spiritual_guidance   TEXT NOT NULL,
      concerning_content   TEXT,
      positive_highlights  TEXT,
      recommended_actions  TEXT,
      prayer_suggestions   TEXT,
      generated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed             BOOLEAN NOT NULL DEFAULT FALSE,
      sent_to_parent       BOOLEAN NOT NULL DEFAULT FALSE,
      CONSTRAINT uq_family_week UNIQUE (family_id, week_start_date, week_end_date)
    );

    CREATE INDEX IF NOT EXISTS idx_wcs_family_week
      ON weekly_content_summaries (family_id, week_start_date);

    -- 5) Conversation contexts (session memory)
    CREATE TABLE IF NOT EXISTS conversation_contexts (
      id                   SERIAL PRIMARY KEY,
      user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id           VARCHAR(255) NOT NULL,
      context_type         VARCHAR(50) NOT NULL,      -- e.g., 'child_chat', 'lesson_session'
      conversation_history TEXT NOT NULL,
      last_activity        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_user_session UNIQUE (user_id, session_id)
    );

    CREATE INDEX IF NOT EXISTS idx_conv_user_last
      ON conversation_contexts (user_id, last_activity DESC);
  `);
}

export async function down(db: any) {
  await db.execute(`
    DROP TABLE IF EXISTS conversation_contexts;
    DROP TABLE IF EXISTS weekly_content_summaries;
    DROP TABLE IF EXISTS content_analysis;
    DROP TABLE IF EXISTS child_activity_logs;
    DROP TABLE IF EXISTS llm_generated_content;

    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type_enum') THEN
        DROP TYPE content_type_enum;
      END IF;
    END $$;
  `);
}