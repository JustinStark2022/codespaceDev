// node_backend/src/db/db.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Create the Neon HTTP client (serverless-friendly; no `pg` needed)
export const sql = neon(DATABASE_URL);

// Create the Drizzle client on top of Neon
export const db = drizzle(sql as any);

// If you want to pass schema for stronger typing, do:
//   import * as schema from "../db/schema";
//   export const db = drizzle(sql, { schema });
