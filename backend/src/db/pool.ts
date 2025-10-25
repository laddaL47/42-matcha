import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('[db] DATABASE_URL is not set. Database features will not work.');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  // Accept default SSL settings for local dev; configure as needed for cloud DBs
});

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>
{
  const res = await pool.query(text, params);
  return { rows: res.rows as T[] };
}
