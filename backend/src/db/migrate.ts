import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function appliedNames(): Promise<Set<string>> {
  const { rows } = await pool.query<{ name: string }>(`SELECT name FROM _migrations ORDER BY id ASC;`);
  return new Set(rows.map((r) => r.name));
}

async function applyMigration(name: string, sql: string) {
  console.log(`[migrate] applying ${name}`);
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations(name) VALUES($1);', [name]);
    await pool.query('COMMIT');
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
}

export async function migrate() {
  await ensureMigrationsTable();
  const applied = await appliedNames();
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const f of files) {
    if (applied.has(f)) continue;
    const p = path.join(MIGRATIONS_DIR, f);
    const sql = fs.readFileSync(p, 'utf8');
    await applyMigration(f, sql);
  }
  console.log('[migrate] done');
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  migrate()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
