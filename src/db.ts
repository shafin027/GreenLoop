import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('DATABASE_URL is not set. Database operations will fail.');
}

// Ensure the application doesn't crash on startup if URL is missing, but operations will fail.
const sql = neon(databaseUrl || 'postgresql://postgres:password@localhost:5432/postgres');
export const db = drizzle(sql, { schema });

export async function connectDB() {
  console.log('Initialized Drizzle with Neon HTTP driver');
}