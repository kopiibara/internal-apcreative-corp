import "dotenv/config";
import { Pool } from "pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const tablesRes = await pool.query(
      `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' AND tablename ILIKE '%cred%';`,
    );

    const tables: string[] = tablesRes.rows.map((r) => r.tablename);

    console.log("Credential-like tables found:", tables.join(", ") || "(none)");

    for (const t of tables) {
      console.log(`\n--- ${t} (first 20 rows) ---`);
      try {
        const rows = await pool.query(`SELECT * FROM "${t}" LIMIT 20`);
        console.table(rows.rows);
      } catch (err) {
        console.error(
          `Failed to select from ${t}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Also try common table names
    const common = [
      "credential",
      "credentials",
      "user_credential",
      "user_credentials",
    ];
    for (const t of common) {
      if (tables.includes(t)) continue;
      try {
        const info = await pool.query(
          `SELECT to_regclass('public."${t}"') as exists`,
        );
        if (info.rows[0].exists) {
          console.log(`\n--- ${t} (first 20 rows) ---`);
          const rows = await pool.query(`SELECT * FROM "${t}" LIMIT 20`);
          console.table(rows.rows);
        }
      } catch {
        // Ignore missing optional tables.
      }
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
