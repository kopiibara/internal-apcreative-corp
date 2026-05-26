import "dotenv/config";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Client } from "pg";
import { Pool } from "pg";

import {
  getBetterAuthBaseUrl,
  getBetterAuthSecret,
  getBetterAuthTrustedOrigins,
} from "../lib/auth/auth-env";

const testingDatabaseUrl = process.env.TESTING_DATABASE_URL;
const liveDatabaseUrl = process.env.LIVE_DATABASE_URL;
const confirmSeed = process.env.CONFIRM_TEST_DB_SEED;
const testPassword = process.env.TEST_ACCOUNT_PASSWORD || "TestPassword123!";

type AccountSeed = {
  fullName: string;
  email: string;
  accountType:
    | "EMPLOYEE"
    | "SUPERVISOR"
    | "MANAGER"
    | "EXECUTIVE"
    | "DIRECTOR"
    | "FULL_STACK_DEVELOPER";
  position: string;
  department: string;
  roleSlug: string;
  primaryBrandSlug: string;
  brandSlugs: string[];
};

const brands = [
  {
    name: "Pro Group Test",
    slug: "pro-group-test",
    description: "Testing brand for Pro Group workflows",
  },
  {
    name: "Neon Nights Test",
    slug: "neon-nights-test",
    description: "Testing brand for Neon Nights workflows",
  },
  {
    name: "Al Qaysar Test",
    slug: "al-qaysar-test",
    description: "Testing brand for Al Qaysar workflows",
  },
];

const roles = [
  {
    name: "Director",
    slug: "director",
    description: "Testing director role",
    level: 90,
  },
  {
    name: "Supervisor",
    slug: "supervisor",
    description: "Testing supervisor role",
    level: 90,
  },
  {
    name: "Brand Officer",
    slug: "brand-officer",
    description: "Testing brand officer role",
    level: 50,
  },
  {
    name: "Multimedia",
    slug: "multimedia",
    description: "Testing multimedia role",
    level: 30,
  },
  {
    name: "Content Creator",
    slug: "content-creator",
    description: "Testing content creator role",
    level: 30,
  },
  {
    name: "Full-stack Developer",
    slug: "full-stack-developer",
    description: "Testing full-stack developer role",
    level: 60,
  },
];

const accounts: AccountSeed[] = [
  {
    fullName: "Director Test",
    email: "testing.director@apcreative.test",
    accountType: "DIRECTOR",
    position: "Director of Marketing",
    department: "Marketing",
    roleSlug: "director",
    primaryBrandSlug: "pro-group-test",
    brandSlugs: ["pro-group-test", "neon-nights-test", "al-qaysar-test"],
  },
  {
    fullName: "Supervisor Test",
    email: "testing.supervisor@apcreative.test",
    accountType: "SUPERVISOR",
    position: "Marketing Supervisor",
    department: "Marketing",
    roleSlug: "supervisor",
    primaryBrandSlug: "pro-group-test",
    brandSlugs: ["pro-group-test", "neon-nights-test", "al-qaysar-test"],
  },
  {
    fullName: "Brand Officer Test",
    email: "testing.brandofficer@apcreative.test",
    accountType: "EMPLOYEE",
    position: "Brand Officer",
    department: "Marketing",
    roleSlug: "brand-officer",
    primaryBrandSlug: "pro-group-test",
    brandSlugs: ["pro-group-test"],
  },
  {
    fullName: "Multimedia Test",
    email: "testing.multimedia@apcreative.test",
    accountType: "EMPLOYEE",
    position: "Multimedia",
    department: "Creatives",
    roleSlug: "multimedia",
    primaryBrandSlug: "pro-group-test",
    brandSlugs: ["pro-group-test", "neon-nights-test"],
  },
  {
    fullName: "Content Creator Test",
    email: "testing.contentcreator@apcreative.test",
    accountType: "EMPLOYEE",
    position: "Content Creator",
    department: "Creatives",
    roleSlug: "content-creator",
    primaryBrandSlug: "pro-group-test",
    brandSlugs: ["pro-group-test", "neon-nights-test"],
  },
  {
    fullName: "Full-stack Developer Test",
    email: "testing.fullstack@apcreative.test",
    accountType: "FULL_STACK_DEVELOPER",
    position: "Full-stack Developer",
    department: "Development",
    roleSlug: "full-stack-developer",
    primaryBrandSlug: "pro-group-test",
    brandSlugs: ["pro-group-test", "neon-nights-test", "al-qaysar-test"],
  },
];

function assertSafeEnvironment() {
  if (!testingDatabaseUrl) {
    throw new Error("Missing TESTING_DATABASE_URL in .env");
  }

  if (confirmSeed !== "YES") {
    throw new Error("Refusing to seed. Set CONFIRM_TEST_DB_SEED=YES first.");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run in NODE_ENV=production.");
  }

  if (liveDatabaseUrl && testingDatabaseUrl === liveDatabaseUrl) {
    throw new Error("TESTING_DATABASE_URL is the same as LIVE_DATABASE_URL.");
  }

  if (!testingDatabaseUrl.includes("neon.tech")) {
    throw new Error("TESTING_DATABASE_URL does not look like a Neon URL.");
  }
}

async function getBetterAuthUserId(client: Client, email: string) {
  const result = await client.query(
    `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
    [email],
  );

  return result.rows[0]?.id as string | undefined;
}

async function markEmailVerifiedIfPossible(client: Client, userId: string) {
  const columnResult = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name IN ('emailVerified', 'email_verified');
  `);

  const columnName = columnResult.rows[0]?.column_name;

  if (!columnName) return;

  await client.query(`UPDATE "user" SET "${columnName}" = true WHERE id = $1`, [
    userId,
  ]);
}

async function upsertBrand(client: Client, brand: (typeof brands)[number]) {
  const result = await client.query(
    `
    INSERT INTO brand (name, slug, description, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, true, now(), now())
    ON CONFLICT (slug)
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_active = true,
      updated_at = now()
    RETURNING id, slug;
    `,
    [brand.name, brand.slug, brand.description],
  );

  return result.rows[0] as { id: number; slug: string };
}

async function upsertRole(client: Client, role: (typeof roles)[number]) {
  const result = await client.query(
    `
    INSERT INTO role (name, slug, description, level, is_system, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, false, true, now(), now())
    ON CONFLICT (slug)
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      level = EXCLUDED.level,
      is_active = true,
      updated_at = now()
    RETURNING id, slug;
    `,
    [role.name, role.slug, role.description, role.level],
  );

  return result.rows[0] as { id: number; slug: string };
}

async function upsertProfile(
  client: Client,
  account: AccountSeed,
  authUserId: string,
) {
  const result = await client.query(
    `
    INSERT INTO profile (
      auth_user_id,
      account_type,
      full_name,
      email,
      position,
      department,
      status,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', now(), now())
    ON CONFLICT (email)
    DO UPDATE SET
      auth_user_id = EXCLUDED.auth_user_id,
      account_type = EXCLUDED.account_type,
      full_name = EXCLUDED.full_name,
      position = EXCLUDED.position,
      department = EXCLUDED.department,
      status = 'ACTIVE',
      updated_at = now()
    RETURNING id;
    `,
    [
      authUserId,
      account.accountType,
      account.fullName,
      account.email,
      account.position,
      account.department,
    ],
  );

  return result.rows[0].id as number;
}

async function upsertBrandAccess(
  client: Client,
  profileId: number,
  brandId: number,
  roleId: number,
  isPrimary: boolean,
) {
  await client.query(
    `
    INSERT INTO user_brand_access (
      profile_id,
      brand_id,
      role_id,
      is_primary,
      is_active,
      granted_at,
      revoked_at,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, true, now(), null, now(), now())
    ON CONFLICT (profile_id, brand_id)
    DO UPDATE SET
      role_id = EXCLUDED.role_id,
      is_primary = EXCLUDED.is_primary,
      is_active = true,
      revoked_at = null,
      updated_at = now();
    `,
    [profileId, brandId, roleId, isPrimary],
  );
}

async function main() {
  assertSafeEnvironment();

  process.env.DATABASE_URL = testingDatabaseUrl;

  const authPool = new Pool({
    connectionString: testingDatabaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const auth = betterAuth({
    appName: "AP Creative Internal Dashboard",
    baseURL: getBetterAuthBaseUrl(),
    trustedOrigins: getBetterAuthTrustedOrigins(),
    secret: getBetterAuthSecret(),
    database: authPool,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      admin({
        defaultRole: "employee",
        adminRoles: ["admin"],
      }),
    ],
  });

  const client = new Client({
    connectionString: testingDatabaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  try {
    console.log("Seeding testing accounts into TESTING_DATABASE_URL only...");
    console.log("Default test password:", testPassword);

    const brandMap = new Map<string, number>();
    const roleMap = new Map<string, number>();

    for (const brand of brands) {
      const savedBrand = await upsertBrand(client, brand);
      brandMap.set(savedBrand.slug, savedBrand.id);
    }

    for (const role of roles) {
      const savedRole = await upsertRole(client, role);
      roleMap.set(savedRole.slug, savedRole.id);
    }

    for (const account of accounts) {
      let authUserId = await getBetterAuthUserId(client, account.email);

      if (!authUserId) {
        const response = await auth.api.signUpEmail({
          body: {
            name: account.fullName,
            email: account.email,
            password: testPassword,
          },
        });

        authUserId = response.user.id;
      }

      await markEmailVerifiedIfPossible(client, authUserId);

      const profileId = await upsertProfile(client, account, authUserId);
      const roleId = roleMap.get(account.roleSlug);

      if (!roleId) {
        throw new Error(`Missing role: ${account.roleSlug}`);
      }

      for (const brandSlug of account.brandSlugs) {
        const brandId = brandMap.get(brandSlug);

        if (!brandId) {
          throw new Error(`Missing brand: ${brandSlug}`);
        }

        await upsertBrandAccess(
          client,
          profileId,
          brandId,
          roleId,
          brandSlug === account.primaryBrandSlug,
        );
      }

      console.log(`Seeded: ${account.email}`);
    }

    console.log("");
    console.log("Testing accounts created successfully:");
    for (const account of accounts) {
      console.log(`${account.position}: ${account.email}`);
    }
    console.log("");
    console.log(`Password for all testing accounts: ${testPassword}`);
  } finally {
    await client.end();
    await authPool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
