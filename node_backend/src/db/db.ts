import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";
import logger from "@/utils/logger";

// Disable connection caching for serverless environments
neonConfig.fetchConnectionCache = false;

const connectionString = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_POOL_URL or DATABASE_URL is not set");
}

export const sql = neon(connectionString);

// Pass the schema to drizzle for strongly-typed queries
export const db = drizzle(sql, { schema, logger: process.env.NODE_ENV === 'development' });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connects to the database with a retry mechanism.
 * @param retries - The number of times to retry the connection.
 * @param delay - The initial delay between retries in milliseconds.
 */
export async function connectWithRetry(retries = 5, delay = 2000) {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    try {
      // Perform a simple query to check the connection
      await sql`SELECT 1`;
      logger.info("✅ Database connected successfully.");
      return;
    } catch (error) {
      lastError = error;
      const currentDelay = delay * 2 ** i; // Exponential backoff
      logger.warn(`❌ Database connection failed. Retrying in ${currentDelay / 1000}s... (Attempt ${i + 1}/${retries})`);
      await sleep(currentDelay);
    }
  }

  logger.error("❌ Could not connect to the database after several retries.", { error: lastError });
  process.exit(1); // Exit the process if the database cannot be reached
}
