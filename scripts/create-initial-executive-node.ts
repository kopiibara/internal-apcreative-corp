import "dotenv/config";

import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Client, Pool } from "pg";

import {
  getBetterAuthBaseUrl,
  getBetterAuthSecret,
  getBetterAuthTrustedOrigins,
} from "../lib/auth/auth-env";

type BetterAuthBootstrap = {
  api: {
    signUpEmail: (input: {
      body: {
        email: string;
        password: string;
        name: string;
      };
    }) => Promise<{ user: { id: string } }>;
  };
};

type BootstrapAccount = {
  name: string;
  email: string;
  password: string;
  accountType:
    | "CLIENT"
    | "EMPLOYEE"
    | "SUPERVISOR"
    | "MANAGER"
    | "EXECUTIVE"
    | "DIRECTOR"
    | "FULL_STACK_DEVELOPER";
  department: string;
};

const defaultPassword =
  process.env.INITIAL_EXECUTIVE_PASSWORD ?? "password123!";

const bootstrapAccounts: BootstrapAccount[] = [
  {
    name: "Marketing Supervisor",
    email: "supervisor@apcreativecorp.com",
    password: defaultPassword,
    accountType: "SUPERVISOR",
    department: "Marketing",
  },
];

if (
  process.env.INITIAL_EXECUTIVE_EMAIL &&
  process.env.INITIAL_EXECUTIVE_PASSWORD
) {
  bootstrapAccounts.push({
    name: process.env.INITIAL_EXECUTIVE_NAME ?? "Initial Executive",
    email: process.env.INITIAL_EXECUTIVE_EMAIL,
    password: process.env.INITIAL_EXECUTIVE_PASSWORD,
    accountType: "FULL_STACK_DEVELOPER",
    department: "Marketing",
  });
}

async function ensureAuthUser(
  auth: BetterAuthBootstrap,
  client: Client,
  account: BootstrapAccount,
) {
  const existing = await client.query(
    `SELECT id, email, name FROM "user" WHERE email = $1 LIMIT 1`,
    [account.email],
  );

  if (existing.rows[0]?.id) {
    return existing.rows[0].id as string;
  }

  await auth.api.signUpEmail({
    body: {
      email: account.email,
      password: account.password,
      name: account.name,
    },
  });

  // Query again to return the id
  const created = await client.query(
    `SELECT id, email, name FROM "user" WHERE email = $1 LIMIT 1`,
    [account.email],
  );

  return created.rows[0]?.id as string | undefined;
}

async function ensureProfile(
  client: Client,
  account: BootstrapAccount,
  authUserId: string,
) {
  await client.query(
    `
    INSERT INTO profile (
      auth_user_id,
      account_type,
      full_name,
      email,
      department,
      status
    )
    VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
    ON CONFLICT (email)
    DO UPDATE SET
      auth_user_id = EXCLUDED.auth_user_id,
      account_type = EXCLUDED.account_type,
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      department = EXCLUDED.department,
      status = 'ACTIVE',
      updated_at = now()
    `,
    [
      authUserId,
      account.accountType,
      account.name,
      account.email,
      account.department,
    ],
  );
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing in .env");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to bootstrap accounts in production.");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const auth = betterAuth({
    appName: "AP Creative Internal Dashboard",
    baseURL: getBetterAuthBaseUrl(),
    trustedOrigins: getBetterAuthTrustedOrigins(),
    secret: getBetterAuthSecret(),
    database: pool,
    emailAndPassword: { enabled: true },
    plugins: [
      admin({
        defaultRole: "employee",
        adminRoles: ["admin"],
      }),
    ],
  });

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    for (const account of bootstrapAccounts) {
      const authUserId = await ensureAuthUser(auth, client, account);

      if (!authUserId) {
        throw new Error(
          `Better Auth user was not created for ${account.email}.`,
        );
      }

      await ensureProfile(client, account, authUserId);

      console.log(`${account.accountType} account is ready.`);
      console.log("Email:", account.email);
      console.log("Better Auth user id:", authUserId);
    }
  } finally {
    await client.end();
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to create initial executive:");
    console.error(error);
    process.exit(1);
  });
