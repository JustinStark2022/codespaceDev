// node_backend/src/db/run-migration.ts
import "dotenv/config";
import path from "path";
import fs from "fs/promises";
import { neon } from "@neondatabase/serverless";

// optional: if you have a logger
// import logger from "../utils/logger";

type DBLike = { execute: (sqlText: string) => Promise<any> };

async function main() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);
  const dbLike: DBLike = {
    execute: async (sqlText: string) => {
      const unsafe = (sql as any).unsafe;
      if (typeof unsafe === "function") return unsafe(sqlText);
      return (sql as any)(sqlText);
    },
  };

  // default to "up" unless "down" passed
  const direction = (process.argv[2] || "up").toLowerCase();

  const migrationsFolder = path.join(__dirname, "migrations");
  const files = (await fs.readdir(migrationsFolder)).filter(f => f.endsWith(".js") || f.endsWith(".ts")).sort();

  console.log(`Starting ${direction.toUpperCase()} migrations...`);
  for (const file of files) {
    const migrationPath = path.join(migrationsFolder, file);
    console.log(`Applying ${direction} for: ${file}`);
    const mod = require(migrationPath);
    const fn = mod[direction];
    if (typeof fn !== "function") {
      console.warn(`Skipped ${file}: no '${direction}' export`);
      continue;
    }
    await fn(dbLike);
    console.log(`✓ ${file} ${direction} applied`);
  }
  console.log(`All ${direction.toUpperCase()} migrations complete.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
