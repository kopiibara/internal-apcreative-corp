import "dotenv/config";
import { Pool } from "pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const emails = [
      process.env.INITIAL_EXECUTIVE_EMAIL ?? "admin@admin.com",
      "supervisor@apcreativecorp.com",
    ];

    console.log("Checking users for:", emails.join(", "));

    const usersRes = await pool.query(
      `SELECT id, email, role, "createdAt", "emailVerified", banned FROM "user" WHERE email = ANY($1)`,
      [emails],
    );

    console.log("\nUsers:");
    console.table(usersRes.rows);

    const profilesRes = await pool.query(
      `SELECT id, auth_user_id, email, account_type, status FROM profile WHERE email = ANY($1)`,
      [emails],
    );

    console.log("\nProfiles:");
    console.table(profilesRes.rows);

    const accountRes = await pool.query(
      `SELECT id, provider, provider_account_id, user_id, "userId", created_at FROM account WHERE user_id = ANY(SELECT id FROM "user" WHERE email = ANY($1)) ORDER BY created_at DESC LIMIT 20`,
      [emails],
    );

    console.log("\nAccounts (recent):");
    console.table(accountRes.rows);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
