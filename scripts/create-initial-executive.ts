import "dotenv/config";

import { auth } from "@/lib/auth";
import { query, transaction } from "@/lib/db";

type AuthUserRow = {
  id: string;
  email: string;
  name: string;
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
  process.env.DEFAULT_TEMPORARY_PASSWORD ?? "password123!";

const bootstrapAccounts: BootstrapAccount[] = [
  {
    name: "Ms. Angela",
    email: "director@apcreativecorp.com",
    password: defaultPassword,
    accountType: "DIRECTOR",
    department: "Marketing",
  },
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

async function ensureAuthUser(account: BootstrapAccount) {
  const existingUser = await query<AuthUserRow>(
    `
    SELECT id, email, name
    FROM "user"
    WHERE email = $1
    LIMIT 1
    `,
    [account.email],
  );

  if (existingUser.rows[0]?.id) {
    return existingUser.rows[0].id;
  }

  await auth.api.createUser({
    body: {
      email: account.email,
      password: account.password,
      name: account.name,
      role: "admin",
    },
  });

  const createdUser = await query<AuthUserRow>(
    `
    SELECT id, email, name
    FROM "user"
    WHERE email = $1
    LIMIT 1
    `,
    [account.email],
  );

  return createdUser.rows[0]?.id;
}

async function ensureProfile(account: BootstrapAccount, authUserId: string) {
  await transaction(async (client) => {
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
      ON CONFLICT (auth_user_id)
      DO UPDATE SET
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
  });
}

async function main() {
  for (const account of bootstrapAccounts) {
    const authUserId = await ensureAuthUser(account);

    if (!authUserId) {
      throw new Error(`Better Auth user was not created for ${account.email}.`);
    }

    await ensureProfile(account, authUserId);

    console.log(`${account.accountType} account is ready.`);
    console.log("Email:", account.email);
    console.log("Better Auth user id:", authUserId);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to create initial executive:");
    console.error(error);
    process.exit(1);
  });
