import "dotenv/config";
import { Client } from "pg";

const testingDatabaseUrl = process.env.TESTING_DATABASE_URL;
const liveDatabaseUrl = process.env.LIVE_DATABASE_URL;
const confirmClean = process.env.CONFIRM_TEST_DB_CLEAN;

async function main() {
  if (!testingDatabaseUrl) {
    throw new Error("Missing TESTING_DATABASE_URL in .env");
  }

  if (confirmClean !== "YES") {
    throw new Error(
      "Refusing to clean database. Set CONFIRM_TEST_DB_CLEAN=YES in .env only when cleaning the testing database.",
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run in production environment.");
  }

  if (liveDatabaseUrl && testingDatabaseUrl === liveDatabaseUrl) {
    throw new Error(
      "TESTING_DATABASE_URL is the same as LIVE_DATABASE_URL. Refusing to continue.",
    );
  }

  if (!testingDatabaseUrl.includes("neon.tech")) {
    throw new Error(
      "TESTING_DATABASE_URL does not look like a Neon database URL. Refusing to continue.",
    );
  }

  console.log("WARNING: This will delete all data from the TESTING database.");
  console.log("Using TESTING_DATABASE_URL only.");

  const client = new Client({
    connectionString: testingDatabaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN (
        '_prisma_migrations',
        'drizzle_migrations',
        '__drizzle_migrations'
      )
      ORDER BY tablename;
    `);

    const tables = tablesResult.rows.map(
      (row) => `"public"."${row.tablename}"`,
    );

    if (tables.length === 0) {
      console.log("No tables found to clean.");
      await client.query("COMMIT");
      return;
    }

    console.log("Cleaning tables:");
    for (const table of tables) {
      console.log(`- ${table}`);
    }

    await client.query(`
      TRUNCATE TABLE ${tables.join(", ")}
      RESTART IDENTITY
      CASCADE;
    `);

    await client.query("COMMIT");

    console.log("Testing database cleaned successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to clean testing database.");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
