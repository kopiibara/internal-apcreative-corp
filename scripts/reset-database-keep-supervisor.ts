import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

loadEnvConfig(process.cwd());

const supervisorEmail = process.env.SUPERVISOR_EMAIL ?? null;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing.");
}

function quoteIdent(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

const protectedTables = [
  "user",
  "session",
  "account",
  "verification",
  "profile",
  "brand",
  "role",
  "permission",
  "role_permission",
  "schema_migrations",
];

async function tableExists(client: Client, tableName: string) {
  const result = await client.query(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = $1
    LIMIT 1
    `,
    [tableName],
  );

  return Boolean(result.rowCount);
}

async function getUserColumn(client: Client, tableName: string) {
  const result = await client.query<{ column_name: string }>(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    `,
    [tableName],
  );

  const columns = result.rows.map((row) => row.column_name);

  return (
    columns.find((column) => column === "userId") ??
    columns.find((column) => column === "user_id") ??
    columns.find((column) => column === "userID") ??
    null
  );
}

async function main() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    const keepResult = await client.query<{
      id: number;
      auth_user_id: string;
      email: string;
      account_type: string;
    }>(
      `
      SELECT id, auth_user_id, email, account_type
      FROM profile
      WHERE account_type = 'SUPERVISOR'
        AND status = 'ACTIVE'
        AND ($1::text IS NULL OR email = $1)
      `,
      [supervisorEmail],
    );

    if (keepResult.rowCount === 0) {
      throw new Error(
        supervisorEmail
          ? `No active SUPERVISOR profile found for ${supervisorEmail}.`
          : "No active SUPERVISOR profile found.",
      );
    }

    const keepProfileIds = keepResult.rows.map((row) => row.id);
    const keepAuthUserIds = keepResult.rows.map((row) => row.auth_user_id);

    console.log("Keeping supervisor profile/s:");
    for (const row of keepResult.rows) {
      console.log(
        `- ${row.email} | profile_id=${row.id} | auth_user_id=${row.auth_user_id}`,
      );
    }

    const tablesResult = await client.query<{ tablename: string }>(
      `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> ALL($1::text[])
      ORDER BY tablename
      `,
      [protectedTables],
    );

    const tablesToTruncate = tablesResult.rows.map((row) => row.tablename);

    if (tablesToTruncate.length > 0) {
      const tableList = tablesToTruncate
        .map((tableName) => `public.${quoteIdent(tableName)}`)
        .join(", ");

      console.log("Truncating non-protected app tables:");
      console.log(tablesToTruncate.join(", "));

      await client.query(
        `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`,
      );
    }

    for (const authTable of ["session", "account"]) {
      if (!(await tableExists(client, authTable))) continue;

      const userColumn = await getUserColumn(client, authTable);

      if (!userColumn) {
        console.warn(`Skipping ${authTable}; no userId/user_id column found.`);
        continue;
      }

      await client.query(
        `
        DELETE FROM public.${quoteIdent(authTable)}
        WHERE ${quoteIdent(userColumn)} <> ALL($1::text[])
        `,
        [keepAuthUserIds],
      );
    }

    if (await tableExists(client, "verification")) {
      await client.query(
        `TRUNCATE TABLE public.${quoteIdent("verification")} RESTART IDENTITY`,
      );
    }

    await client.query(
      `
      DELETE FROM profile
      WHERE id <> ALL($1::int[])
      `,
      [keepProfileIds],
    );

    await client.query(
      `
      DELETE FROM public.${quoteIdent("user")}
      WHERE id <> ALL($1::text[])
      `,
      [keepAuthUserIds],
    );

    await client.query("COMMIT");

    console.log("Database reset complete.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database reset failed. Rolled back changes.");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
