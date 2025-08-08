// node_backend/src/db/run-migration.ts
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
// Uses your existing add_llm_tables.ts which expects `db.execute(sqlText)`
import { up, down } from "./migrations/add_llm_tables";

type DBLike = { execute: (sqlText: string) => Promise<any> };

async function main() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const sql = neon(DATABASE_URL);

  // Adapter so your migration's `db.execute("...")` works with Neon
  const dbLike: DBLike = {
    execute: async (sqlText: string) => {
      const unsafe = (sql as any).unsafe;
      if (typeof unsafe === "function") {
        return unsafe(sqlText); // Neon raw SQL
      }
      // Fallback (rarely used)
      return (sql as any)(sqlText);
    },
  };

  const direction = (process.argv[2] || "up").toLowerCase();

  if (direction === "down") {
    console.log("⏬ Running DOWN migration...");
    await down(dbLike);
    console.log("✅ DOWN migration complete");
  } else {
    console.log("⏫ Running UP migration...");
    await up(dbLike);
    console.log("✅ UP migration complete");
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
