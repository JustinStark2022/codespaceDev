// src/db/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
// pg v8+ ships as a default export under ESM
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Database connection stub
export const db = {
  insert: (table: any) => ({
    values: (data: any) => ({
      returning: () => Promise.resolve([data]),
    }),
  }),
  select: () => ({
    from: (table: any) => ({
      where: (condition: any) => ({
        orderBy: (order: any) => ({
          limit: (num: number) => Promise.resolve([]),
        }),
        limit: (num: number) => Promise.resolve([]),
      }),
      orderBy: (order: any) => ({
        limit: (num: number) => Promise.resolve([]),
      }),
      limit: (num: number) => Promise.resolve([]),
    }),
  }),
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => Promise.resolve(),
    }),
  }),
};
