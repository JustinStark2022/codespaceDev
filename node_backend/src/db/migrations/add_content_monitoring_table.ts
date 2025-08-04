import { drizzle } from "drizzle-orm/node-postgres";

export async function up(db: any) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS content_monitoring (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_type VARCHAR(50) NOT NULL,
      content_source VARCHAR(255),
      content_snippet TEXT NOT NULL,
      analysis_result TEXT NOT NULL,
      safety_level VARCHAR(20) NOT NULL,
      flagged BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function down(db: any) {
  await db.execute(`DROP TABLE IF EXISTS content_monitoring;`);
}
