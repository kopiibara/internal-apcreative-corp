import "dotenv/config"

import { pool } from "@/lib/db"

async function main() {
  const migration = await pool.query<{ filename: string; applied_at: Date }>(
    `
    SELECT filename, applied_at
    FROM schema_migrations
    WHERE filename = '020_meta_facebook_monitoring.sql'
    `
  )

  const tables = await pool.query<{ table_name: string }>(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'meta_%'
    ORDER BY table_name
    `
  )

  const permissions = await pool.query<{ key: string }>(
    `
    SELECT key
    FROM permission
    WHERE key LIKE 'meta_monitoring.%'
    ORDER BY key
    `
  )

  console.log("Migration applied:", migration.rows[0] ?? "NOT FOUND")
  console.log("Meta tables:", tables.rows.map((r) => r.table_name).join(", ") || "NONE")
  console.log("Permissions:", permissions.rows.map((r) => r.key).join(", ") || "NONE")

  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exit(1)
})
