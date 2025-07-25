import { pgTable, serial, varchar, text, integer, boolean, timestamp, date } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export async function up(db: any) {
  // Create LLM generated content table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS llm_generated_content (
      id SERIAL PRIMARY KEY,
      content_type VARCHAR(50) NOT NULL,
      prompt TEXT NOT NULL,
      system_prompt TEXT,
      generated_content TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      child_id INTEGER REFERENCES users(id),
      context VARCHAR(100),
      tokens_used INTEGER,
      generation_time_ms INTEGER,
      quality_rating INTEGER,
      reviewed BOOLEAN DEFAULT FALSE,
      approved BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create child activity logs table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS child_activity_logs (
      id SERIAL PRIMARY KEY,
      child_id INTEGER REFERENCES users(id) NOT NULL,
      activity_type VARCHAR(50) NOT NULL,
      activity_name VARCHAR(255) NOT NULL,
      platform VARCHAR(50),
      duration_minutes INTEGER,
      content_category VARCHAR(50),
      content_rating VARCHAR(10),
      flagged BOOLEAN DEFAULT FALSE,
      flag_reason VARCHAR(255),
      ai_analysis TEXT,
      timestamp TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create content analysis table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS content_analysis (
      id SERIAL PRIMARY KEY,
      child_id INTEGER REFERENCES users(id) NOT NULL,
      content_name VARCHAR(255) NOT NULL,
      content_type VARCHAR(50) NOT NULL,
      platform VARCHAR(50),
      url TEXT,
      ai_analysis TEXT NOT NULL,
      safety_score INTEGER,
      content_themes TEXT,
      recommended_age VARCHAR(20),
      parent_guidance_needed BOOLEAN DEFAULT FALSE,
      guidance_notes TEXT,
      reviewed_by_parent BOOLEAN DEFAULT FALSE,
      approved BOOLEAN,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create weekly content summaries table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS weekly_content_summaries (
      id SERIAL PRIMARY KEY,
      family_id INTEGER REFERENCES users(id) NOT NULL,
      week_start_date DATE NOT NULL,
      week_end_date DATE NOT NULL,
      summary_content TEXT NOT NULL,
      parental_advice TEXT NOT NULL,
      discussion_topics TEXT,
      spiritual_guidance TEXT NOT NULL,
      concerning_content TEXT,
      positive_highlights TEXT,
      recommended_actions TEXT,
      prayer_suggestions TEXT,
      generated_at TIMESTAMP DEFAULT NOW(),
      reviewed BOOLEAN DEFAULT FALSE,
      sent_to_parent BOOLEAN DEFAULT FALSE
    );
  `);

  // Create conversation contexts table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversation_contexts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) NOT NULL,
      session_id VARCHAR(255) NOT NULL,
      context_type VARCHAR(50) NOT NULL,
      conversation_history TEXT NOT NULL,
      last_activity TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create indexes for better performance
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_llm_content_type ON llm_generated_content(content_type);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_llm_user_id ON llm_generated_content(user_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_activity_child_id ON child_activity_logs(child_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON child_activity_logs(timestamp);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_content_analysis_child ON content_analysis(child_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_weekly_summary_family ON weekly_content_summaries(family_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_conversation_user ON conversation_contexts(user_id);`);
}

export async function down(db: any) {
  await db.execute(`DROP TABLE IF EXISTS conversation_contexts;`);
  await db.execute(`DROP TABLE IF EXISTS weekly_content_summaries;`);
  await db.execute(`DROP TABLE IF EXISTS content_analysis;`);
  await db.execute(`DROP TABLE IF EXISTS child_activity_logs;`);
  await db.execute(`DROP TABLE IF EXISTS llm_generated_content;`);
}
