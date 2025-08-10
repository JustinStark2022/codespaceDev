import { drizzle } from "drizzle-orm/node-postgres";

/**
 * Creates content_monitoring with strong constraints, enums, and indexes.
 */
export async function up(db: any) {
  await db.execute(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'safety_level_enum') THEN
        CREATE TYPE safety_level_enum AS ENUM ('safe', 'caution', 'unsafe');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS content_monitoring (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_type    VARCHAR(50) NOT NULL,
      content_source  VARCHAR(255),
      content_snippet TEXT NOT NULL,
      analysis_result TEXT NOT NULL,
      safety_level    safety_level_enum NOT NULL,
      flagged         BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Helpful indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_cm_user_created_at
      ON content_monitoring (user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_cm_parent_created_at
      ON content_monitoring (parent_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_cm_flagged
      ON content_monitoring (flagged);

    CREATE INDEX IF NOT EXISTS idx_cm_safety_level
      ON content_monitoring (safety_level);
  `);
}

export async function down(db: any) {
  await db.execute(`
    DROP TABLE IF EXISTS content_monitoring;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'safety_level_enum') THEN
        DROP TYPE safety_level_enum;
      END IF;
    END $$;
  `);
}