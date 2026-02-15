import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.join(__dirname, '../../.env');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  throw new Error(`.env file not found at: ${envPath}`);
}

dotenv.config({ path: envPath });

// Define the schema for required environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(val => parseInt(val, 10)),
  
  // Database
  DATABASE_URL: z.string().url(),
  PGHOST: z.string(),
  PGUSER: z.string(),
  PGPASSWORD: z.string(),
  PGDATABASE: z.string(),
  
  // API Keys
  BIBLE_API_KEY: z.string().optional(),
  RUNPOD_API_KEY: z.string().optional(),
  RUNPOD_ENDPOINT_ID: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  // CORS
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
  
  // API
  API_VERSION: z.string().default('v1'),
  API_PREFIX: z.string().default('/api'),
  
  // Session
  SESSION_SECRET: z.string().min(8),
  SESSION_TIMEOUT: z.string().default('3600000').transform(val => parseInt(val, 10)),
  
  // File Upload
  MAX_FILE_SIZE: z.string().default('10485760').transform(val => parseInt(val, 10)),
  UPLOAD_DIR: z.string().default('./uploads'),
  
  // Logging
  LOG_LEVEL: z.string().default('info'),
  LOG_FORMAT: z.string().default('combined'),
  DEBUG: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  try {
    const result = envSchema.parse(process.env);
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[ERROR] Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('[ERROR] Failed to load environment:', error);
    }
    process.exit(1);
  }
}

// Test database connection
export async function testDatabaseConnection(): Promise<void> {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);
    
    await sql`SELECT 1 as test, current_database() as db_name`;
  } catch (error) {
    throw new Error(`Database connection failed: ${error}`);
  }
}

export const env = validateEnv();
