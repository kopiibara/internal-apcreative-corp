import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

import {
  createScriptPoolConfig,
  formatDatabaseConnectionError,
  getScriptDatabaseUrlLabel,
} from "./db-connection";

const migrationsDir = path.join(process.cwd(), "db", "migrations");

const pool = new Pool(createScriptPoolConfig());

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query<{ filename: string }>(`
    SELECT filename
    FROM schema_migrations
    ORDER BY filename ASC;
  `);

  return new Set(result.rows.map((row) => row.filename));
}

async function runMigration(filename: string, sql: string) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log(`Running migration: ${filename}`);

    await client.query(sql);

    await client.query(
      `
      INSERT INTO schema_migrations (filename)
      VALUES ($1)
      ON CONFLICT (filename) DO NOTHING;
      `,
      [filename],
    );

    await client.query("COMMIT");

    console.log(`Done: ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(`Failed migration: ${filename}`);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  console.log(`Using ${getScriptDatabaseUrlLabel()} for migrations.`);

  await ensureMigrationTable();

  const appliedMigrations = await getAppliedMigrations();

  const files = await fs.readdir(migrationsDir);

  const migrationFiles = files
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  if (migrationFiles.length === 0) {
    console.log("No migration files found.");
    return;
  }

  for (const filename of migrationFiles) {
    if (appliedMigrations.has(filename)) {
      console.log(`Skipping already applied migration: ${filename}`);
      continue;
    }

    const filePath = path.join(migrationsDir, filename);
    const sql = await fs.readFile(filePath, "utf8");

    await runMigration(filename, sql);
  }

  console.log("All migrations completed.");
}

main()
  .catch((error) => {
    console.error(formatDatabaseConnectionError(error));
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
