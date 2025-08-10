// drizzle.config.ts
import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
import { z } from "zod";

// If this file sits in node_backend/, point to that env file.
// Change the path below if your env lives somewhere else.
dotenv.config({ path: "./.env" });
// If you truly keep it as ../.env.node_backend, use:
// dotenv.config({ path: "../.env.node_backend" });

const env = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  })
  .parse(process.env);

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",          // migrations folder
  dialect: "postgresql",     // replaces old `driver: "pg"`
  dbCredentials: {
    url: env.DATABASE_URL,   // Neon URL, include ?sslmode=require
  },
  strict: true,
  verbose: env.NODE_ENV !== "production",
} satisfies Config;