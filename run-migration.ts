import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { up } from "./src/db/migrations/add_llm_tables";

async function runMigration() {
  const pool = new Pool({
    connectionString: "your-neon-database-connection-string", // Replace with your Neon connection string
  });

  const db = drizzle(pool);

  try {
    console.log("Running migration...");
    await up(db);
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

runMigration();
