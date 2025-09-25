import dotenv from 'dotenv';
import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

dotenv.config();

// Prefer a full connection string, otherwise fall back to discrete PG* vars
let RAW_URL = (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '').trim();
// Validate RAW_URL is a proper URL; if not, ignore it
if (RAW_URL) {
  try {
    // eslint-disable-next-line no-new
    new URL(RAW_URL);
  } catch {
    console.warn('[DB] Invalid DATABASE_URL detected, falling back to discrete PG* env variables.');
    RAW_URL = '';
  }
}

const FALLBACKS: PoolConfig = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'homestead_tracker',
};

let poolConfig: PoolConfig;
if (RAW_URL) {
  poolConfig = { connectionString: RAW_URL } as PoolConfig;
} else {
  poolConfig = { ...FALLBACKS } as PoolConfig;
}

export const pool = new Pool(poolConfig);
if (process.env.NODE_ENV !== 'production') {
  console.log('[DB] Pool initialized with', RAW_URL ? { connectionString: '(url provided)' } : FALLBACKS);
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('db', { duration, rows: (res as QueryResult).rowCount, text: text.slice(0, 80) });
  }
  return res;
}
