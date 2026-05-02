/**
 * server/db.ts — Drizzle ORM + PostgreSQL connection pool.
 *
 * G8 fix: RLS SET LOCAL only inside transactions. All row-level workspace
 * isolation is enforced at the middleware/storage layer (not DB-level RLS),
 * so every query goes through workspace-scoped storage functions that always
 * include a workspaceId WHERE clause.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from './env.js';
import * as schema from '../shared/schema.js';
import logger from './lib/logger.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max:              20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL pool error');
});

pool.on('connect', () => {
  logger.debug('PostgreSQL pool: new client connected');
});

export const db = drizzle(pool, { schema, logger: false });

export { pool };

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err) {
    logger.error({ err }, 'Database connection check failed');
    return false;
  }
}
