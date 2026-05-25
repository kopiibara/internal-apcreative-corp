"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { z } from "zod";

import { auth } from "@/lib/auth/auth";
import {
  DEFAULT_DEPARTMENT,
  CLIENT_VIEWER_DEPARTMENT,
} from "@/lib/auth/account-defaults";
import {
  deriveAccountTypeFromRoleSlugs,
  derivePositionFromRoles,
  type AccountType,
  isEmployeeAccountType,
} from "@/lib/auth/account-type";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { can } from "@/lib/permissions";
import {
  getDefaultAccountPassword,
  getDefaultTemporaryPassword,
} from "@/lib/server/account-secrets";
import { query, transaction } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  assignBrandAccessSchema,
  brandAssignmentSchema,
  createAccountSchema,
  disableAccountSchema,
  forceChangePasswordSchema,
  removeBrandAccessSchema,
  softDeleteAccountSchema,
  updateAccountSchema,
  validateBrandAssignments,
} from "@/app/admin/account-control/schema";

const ACCOUNT_CONTROL_PATH = "/admin/account-control";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

type ProfileAccessSummary = {
  account_type: AccountType;
  active_count: number;
  active_primary_count: number;
};

type AuthUserLookupRow = {
  id: string;
};

type AccountActionProfileRow = {
  id: number;
  auth_user_id: string;
  full_name: string;
  email: string;
  account_type: AccountType;
  status: string;
};

type RoleRow = {
  id: number;
  slug: string;
  name: string;
};

const accountActionRanks: Record<AccountType, number> = {
  CLIENT: 10,
  EMPLOYEE: 20,
  SUPERVISOR: 70,
  MANAGER: 80,
  DIRECTOR: 85,
  EXECUTIVE: 90,
  FULL_STACK_DEVELOPER: 100,
};

type BrandRow = {
  id: number;
  slug: string;
  name: string;
};

async function authorizeAction(
  permissionKey: string,
): Promise<ActionResult | null> {
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      success: false,
      message: "You must be signed in to perform this action.",
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      success: false,
      message: "Your account is not active.",
    };
  }

  const allowed = await can(context.profile.auth_user_id, permissionKey);

  if (!allowed) {
    return {
      success: false,
      message: "You do not have permission to perform this action.",
    };
  }

  return null;
}

function getAuthRole(accountType: AccountType) {
  return isEmployeeAccountType(accountType) ? "user" : "admin";
}

async function getAuthUserIdByEmail(email: string) {
  const result = await query<AuthUserLookupRow>(
    `
    SELECT id
    FROM "user"
    WHERE email = $1
    LIMIT 1
    `,
    [email],
  );

  return result.rows[0]?.id;
}

async function getRolesByIds(roleIds: number[]) {
  if (roleIds.length === 0) {
    return [] as RoleRow[];
  }

  const result = await query<RoleRow>(
    `
    SELECT id, slug, name
    FROM "role"
    WHERE id = ANY($1::int[])
    `,
    [roleIds],
  );

  return result.rows;
}

async function getBrandsByIds(brandIds: number[]) {
  if (brandIds.length === 0) {
    return [] as BrandRow[];
  }

  const result = await query<BrandRow>(
    `
    SELECT id, slug, name
    FROM brand
    WHERE id = ANY($1::int[])
    `,
    [brandIds],
  );

  return result.rows;
}

async function getAllBrandAssignmentError(
  assignments: z.infer<typeof brandAssignmentSchema>[],
  roles: RoleRow[],
) {
  const brands = await getBrandsByIds(
    assignments.map((assignment) => assignment.brandId),
  );
  const brandsById = new Map(brands.map((brand) => [brand.id, brand]));
  const rolesById = new Map(roles.map((role) => [role.id, role]));

  for (const assignment of assignments) {
    const brand = brandsById.get(assignment.brandId);

    if (brand?.slug !== "all-brand") {
      continue;
    }

    const role = rolesById.get(assignment.roleId);

    if (role?.slug !== "full-stack-developer") {
      return "All Brand can only be assigned with the Full Stack Developer role.";
    }
  }

  return null;
}

function hasClientViewerRole(roles: RoleRow[]) {
  return roles.some((role) => role.slug === "client-viewer");
}

async function getActiveRolesForProfile(client: PoolClient, profileId: number) {
  const result = await client.query<RoleRow>(
    `
    SELECT DISTINCT r.id, r.slug, r.name
    FROM user_brand_access uba
    JOIN "role" r ON r.id = uba.role_id
    WHERE uba.profile_id = $1
      AND uba.is_active = true
    `,
    [profileId],
  );

  return result.rows;
}

async function recomputeProfileAccess(client: PoolClient, profileId: number) {
  const roles = await getActiveRolesForProfile(client, profileId);
  const roleSlugs = roles.map((role) => role.slug);
  const accountType = deriveAccountTypeFromRoleSlugs(roleSlugs);
  const position = derivePositionFromRoles(roles);

  await client.query(
    `
    UPDATE profile
    SET
      account_type = $2,
      position = $3,
      updated_at = now()
    WHERE id = $1
    `,
    [profileId, accountType, position],
  );

  return accountType;
}

async function removeAuthUserIfPossible(userId: string) {
  try {
    await auth.api.removeUser({
      body: { userId },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Failed to remove orphaned Better Auth user:", error);
  }
}

async function revokeAuthSessionsIfPossible(userId: string) {
  try {
    await auth.api.revokeUserSessions({
      body: { userId },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Failed to revoke Better Auth sessions:", error);
  }
}

function canUseSensitiveAccountAction(accountType: AccountType) {
  return (
    accountType === "FULL_STACK_DEVELOPER" ||
    accountType === "SUPERVISOR" ||
    accountType === "MANAGER" ||
    accountType === "DIRECTOR" ||
    accountType === "EXECUTIVE"
  );
}

async function getActionProfile(profileId: number) {
  const result = await query<AccountActionProfileRow>(
    `
    SELECT id, auth_user_id, full_name, email, account_type, status
    FROM profile
    WHERE id = $1
    LIMIT 1
    `,
    [profileId],
  );

  return result.rows[0] ?? null;
}

async function authorizeSensitiveAccountAction(targetProfileId: number) {
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      error: {
        success: false,
        message: "You must be signed in to perform this action.",
      } satisfies ActionResult,
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      error: {
        success: false,
        message: "Your account is not active.",
      } satisfies ActionResult,
    };
  }

  if (!canUseSensitiveAccountAction(context.profile.account_type)) {
    return {
      error: {
        success: false,
        message: "You do not have permission to perform this action.",
      } satisfies ActionResult,
    };
  }

  const allowed = await can(context.profile.auth_user_id, "accounts.update");

  if (!allowed) {
    return {
      error: {
        success: false,
        message: "You do not have permission to manage accounts.",
      } satisfies ActionResult,
    };
  }

  const target = await getActionProfile(targetProfileId);

  if (!target) {
    return {
      error: {
        success: false,
        message: "Target account was not found.",
      } satisfies ActionResult,
    };
  }

  if (target.status === "DELETED" || target.status === "ARCHIVED") {
    return {
      error: {
        success: false,
        message: "This account can no longer be modified.",
      } satisfies ActionResult,
    };
  }

  if (
    accountActionRanks[context.profile.account_type] <
    accountActionRanks[target.account_type]
  ) {
    return {
      error: {
        success: false,
        message: "You cannot manage a higher-access account.",
      } satisfies ActionResult,
    };
  }

  return { context, target, error: null };
}

async function createAccountControlLog({
  actorProfileId,
  targetProfileId,
  action,
  summary,
  metadata,
}: {
  actorProfileId: number;
  targetProfileId: number;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await query(
    `
    INSERT INTO account_control_logs (
      actor_profile_id,
      target_profile_id,
      action,
      summary,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [
      actorProfileId,
      targetProfileId,
      action,
      summary,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
}

function getBrandAssignmentValidationMessage(
  accountType: AccountType,
  assignments: z.infer<typeof brandAssignmentSchema>[],
) {
  const issues: { message: string }[] = [];
  const context = {
    addIssue: (issue: { message: string }) => {
      issues.push(issue);
    },
  };

  validateBrandAssignments(
    accountType,
    assignments,
    context as unknown as z.RefinementCtx,
  );

  return issues[0]?.message ?? null;
}

function validateEmployeeAccessSummary(
  summary: ProfileAccessSummary | undefined,
) {
  if (!summary) {
    return "Account profile was not found.";
  }

  if (!isEmployeeAccountType(summary.account_type)) {
    return null;
  }

  if (summary.active_count < 1) {
    return "CLIENT and EMPLOYEE accounts need at least one active brand.";
  }

  if (summary.active_primary_count !== 1) {
    return "CLIENT and EMPLOYEE accounts need exactly one primary active brand.";
  }

  return null;
}

export async function createAccount(input: unknown): Promise<ActionResult> {
  const authError = await authorizeAction("accounts.create");

  if (authError) {
    return authError;
  }

  const rateLimit = await enforceRateLimit({
    bucket: "account:create",
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = createAccountSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid account details.",
    };
  }

  const data = parsed.data;
  const roleIds = data.brandAssignments.map((assignment) => assignment.roleId);
  const roles = await getRolesByIds(roleIds);
  const roleSlugs = roles.map((role) => role.slug);
  const accountType = deriveAccountTypeFromRoleSlugs(roleSlugs);
  const position = derivePositionFromRoles(roles);
  const allBrandAssignmentError = await getAllBrandAssignmentError(
    data.brandAssignments,
    roles,
  );

  if (allBrandAssignmentError) {
    return {
      success: false,
      message: allBrandAssignmentError,
    };
  }

  const brandAssignmentError = getBrandAssignmentValidationMessage(
    accountType,
    data.brandAssignments,
  );

  if (brandAssignmentError) {
    return {
      success: false,
      message: brandAssignmentError,
    };
  }

  let temporaryPassword: string;

  try {
    temporaryPassword = getDefaultTemporaryPassword();
  } catch {
    return {
      success: false,
      message: "Default temporary password is not configured.",
    };
  }

  const shouldUseClientDepartment = hasClientViewerRole(roles);
  const department = shouldUseClientDepartment
    ? (data.department ?? CLIENT_VIEWER_DEPARTMENT)
    : DEFAULT_DEPARTMENT;

  let authUserId: string | undefined;
  let createdProfileId: number | null = null;

  try {
    const createdUser = await auth.api.createUser({
      body: {
        email: data.email,
        password: temporaryPassword,
        name: data.fullName,
        role: getAuthRole(accountType),
      },
    });

    authUserId = createdUser.user.id;

    await transaction(async (client) => {
      const profileResult = await client.query<{ id: number }>(
        `
        INSERT INTO profile (
          auth_user_id,
          account_type,
          full_name,
          email,
          position,
          department,
          phone_number,
          status,
          must_change_password
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
        `,
        [
          authUserId,
          accountType,
          data.fullName,
          data.email,
          position,
          department,
          data.phoneNumber,
          data.status,
          true,
        ],
      );
      const profileId = profileResult.rows[0]?.id;

      if (!profileId) {
        throw new Error("Profile was not created.");
      }
      createdProfileId = profileId;

      for (const assignment of data.brandAssignments) {
        await client.query(
          `
          INSERT INTO user_brand_access (
            profile_id,
            brand_id,
            role_id,
            is_primary,
            is_active,
            revoked_at
          )
          VALUES ($1, $2, $3, $4, $5, CASE WHEN $5::boolean THEN NULL ELSE now() END)
          `,
          [
            profileId,
            assignment.brandId,
            assignment.roleId,
            assignment.isPrimary,
            assignment.isActive,
          ],
        );
      }

      await recomputeProfileAccess(client, profileId);

      const summaryResult = await client.query<ProfileAccessSummary>(
        `
        SELECT
          p.account_type,
          COUNT(uba.id) FILTER (WHERE uba.is_active = true)::integer AS active_count,
          COUNT(uba.id) FILTER (
            WHERE uba.is_active = true AND uba.is_primary = true
          )::integer AS active_primary_count
        FROM profile p
        LEFT JOIN user_brand_access uba ON uba.profile_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
        LIMIT 1
        `,
        [profileId],
      );
      const validationError = validateEmployeeAccessSummary(
        summaryResult.rows[0],
      );

      if (validationError) {
        throw new Error(validationError);
      }
    });

    revalidatePath(ACCOUNT_CONTROL_PATH);

    const actor = await getCurrentProfileContext();

    if (actor && createdProfileId) {
      await createAccountControlLog({
        actorProfileId: actor.profile.id,
        targetProfileId: createdProfileId,
        action: "ACCOUNT_CREATED",
        summary: `Account created for ${data.fullName}.`,
        metadata: {
          targetAccountType: accountType,
          status: data.status,
        },
      });
    }

    return {
      success: true,
      message: "Account created successfully.",
    };
  } catch (error) {
    if (authUserId) {
      await removeAuthUserIfPossible(authUserId);
    } else {
      const existingAuthUserId = await getAuthUserIdByEmail(data.email);

      if (existingAuthUserId) {
        authUserId = existingAuthUserId;
      }
    }

    console.error("createAccount failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function updateAccount(input: unknown): Promise<ActionResult> {
  const authError = await authorizeAction("accounts.update");

  if (authError) {
    return authError;
  }

  const rateLimit = await enforceRateLimit({
    bucket: "account:update",
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = updateAccountSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid account details.",
    };
  }

  const data = parsed.data;

  try {
    await transaction(async (client) => {
      const roles = await getActiveRolesForProfile(client, data.profileId);
      const shouldUseClientDepartment = hasClientViewerRole(roles);
      const department = shouldUseClientDepartment
        ? data.department
        : DEFAULT_DEPARTMENT;

      await client.query(
        `
        UPDATE profile
        SET
          full_name = $2,
          department = $3,
          phone_number = $4,
          status = $5,
          updated_at = now()
        WHERE id = $1
        `,
        [
          data.profileId,
          data.fullName,
          department,
          data.phoneNumber,
          data.status,
        ],
      );

      await recomputeProfileAccess(client, data.profileId);

      const summaryResult = await client.query<ProfileAccessSummary>(
        `
        SELECT
          p.account_type,
          COUNT(uba.id) FILTER (WHERE uba.is_active = true)::integer AS active_count,
          COUNT(uba.id) FILTER (
            WHERE uba.is_active = true AND uba.is_primary = true
          )::integer AS active_primary_count
        FROM profile p
        LEFT JOIN user_brand_access uba ON uba.profile_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
        LIMIT 1
        `,
        [data.profileId],
      );
      const validationError = validateEmployeeAccessSummary(
        summaryResult.rows[0],
      );

      if (validationError) {
        throw new Error(validationError);
      }
    });

    revalidatePath(ACCOUNT_CONTROL_PATH);
    const actor = await getCurrentProfileContext();

    if (actor) {
      await createAccountControlLog({
        actorProfileId: actor.profile.id,
        targetProfileId: data.profileId,
        action: "ACCOUNT_UPDATED",
        summary: `Account profile was updated for ${data.fullName}.`,
        metadata: {
          status: data.status,
        },
      });
    }

    return {
      success: true,
      message: "Account updated successfully.",
    };
  } catch (error) {
    console.error("updateAccount failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function disableAccount(input: unknown): Promise<ActionResult> {
  const authError = await authorizeAction("accounts.disable");

  if (authError) {
    return authError;
  }

  const rateLimit = await enforceRateLimit({
    bucket: "account:disable",
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = disableAccountSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid account.",
    };
  }

  try {
    const result = await query<{ auth_user_id: string }>(
      `
      UPDATE profile
      SET status = 'DISABLED',
          updated_at = now()
      WHERE id = $1
      RETURNING auth_user_id
      `,
      [parsed.data.profileId],
    );
    const authUserId = result.rows[0]?.auth_user_id;

    if (authUserId) {
      await revokeAuthSessionsIfPossible(authUserId);
    }

    revalidatePath(ACCOUNT_CONTROL_PATH);
    const actor = await getCurrentProfileContext();

    if (actor) {
      await createAccountControlLog({
        actorProfileId: actor.profile.id,
        targetProfileId: parsed.data.profileId,
        action: "LOGIN_ACCESS_UPDATED",
        summary: "Account was disabled.",
        metadata: {
          newStatus: "DISABLED",
        },
      });
    }

    return {
      success: true,
      message: "Account disabled successfully.",
    };
  } catch (error) {
    console.error("disableAccount failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function assignBrandAccess(input: unknown): Promise<ActionResult> {
  const authError = await authorizeAction("accounts.update");

  if (authError) {
    return authError;
  }

  const rateLimit = await enforceRateLimit({
    bucket: "account:update",
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = assignBrandAccessSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid brand access.",
    };
  }

  const data = parsed.data;

  try {
    const roles = await getRolesByIds([data.roleId]);
    const allBrandAssignmentError = await getAllBrandAssignmentError(
      [
        {
          brandId: data.brandId,
          roleId: data.roleId,
          isPrimary: data.isPrimary,
          isActive: data.isActive,
        },
      ],
      roles,
    );

    if (allBrandAssignmentError) {
      return {
        success: false,
        message: allBrandAssignmentError,
      };
    }

    await transaction(async (client) => {
      const profileResult = await client.query<{ account_type: AccountType }>(
        `
        SELECT account_type
        FROM profile
        WHERE id = $1
        LIMIT 1
        `,
        [data.profileId],
      );
      const currentAccountType = profileResult.rows[0]?.account_type;

      if (!currentAccountType) {
        throw new Error("Account profile was not found.");
      }

      if (
        isEmployeeAccountType(currentAccountType) &&
        data.isActive &&
        data.isPrimary
      ) {
        await client.query(
          `
          UPDATE user_brand_access
          SET is_primary = false,
              updated_at = now()
          WHERE profile_id = $1
          `,
          [data.profileId],
        );
      }

      await client.query(
        `
        INSERT INTO user_brand_access (
          profile_id,
          brand_id,
          role_id,
          is_primary,
          is_active,
          granted_at,
          revoked_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          now(),
          CASE WHEN $5::boolean THEN NULL ELSE now() END
        )
        ON CONFLICT (profile_id, brand_id)
        DO UPDATE SET
          role_id = EXCLUDED.role_id,
          is_primary = EXCLUDED.is_primary,
          is_active = EXCLUDED.is_active,
          granted_at = CASE
            WHEN EXCLUDED.is_active = true
              AND user_brand_access.is_active = false THEN now()
            ELSE user_brand_access.granted_at
          END,
          revoked_at = CASE
            WHEN EXCLUDED.is_active = true THEN NULL
            WHEN user_brand_access.revoked_at IS NULL THEN now()
            ELSE user_brand_access.revoked_at
          END,
          updated_at = now()
        `,
        [
          data.profileId,
          data.brandId,
          data.roleId,
          data.isPrimary,
          data.isActive,
        ],
      );

      await recomputeProfileAccess(client, data.profileId);

      const summaryResult = await client.query<ProfileAccessSummary>(
        `
        SELECT
          p.account_type,
          COUNT(uba.id) FILTER (WHERE uba.is_active = true)::integer AS active_count,
          COUNT(uba.id) FILTER (
            WHERE uba.is_active = true AND uba.is_primary = true
          )::integer AS active_primary_count
        FROM profile p
        LEFT JOIN user_brand_access uba ON uba.profile_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
        LIMIT 1
        `,
        [data.profileId],
      );
      const validationError = validateEmployeeAccessSummary(
        summaryResult.rows[0],
      );

      if (validationError) {
        throw new Error(validationError);
      }
    });

    revalidatePath(ACCOUNT_CONTROL_PATH);
    const actor = await getCurrentProfileContext();

    if (actor) {
      await createAccountControlLog({
        actorProfileId: actor.profile.id,
        targetProfileId: data.profileId,
        action: "BRAND_ACCESS_UPDATED",
        summary: "Brand access was updated.",
        metadata: {
          brandId: data.brandId,
          roleId: data.roleId,
          isPrimary: data.isPrimary,
          isActive: data.isActive,
        },
      });
    }

    return {
      success: true,
      message: "Brand access assigned successfully.",
    };
  } catch (error) {
    console.error("assignBrandAccess failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function removeBrandAccess(input: unknown): Promise<ActionResult> {
  const authError = await authorizeAction("accounts.update");

  if (authError) {
    return authError;
  }

  const rateLimit = await enforceRateLimit({
    bucket: "account:update",
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = removeBrandAccessSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid brand access.",
    };
  }

  const data = parsed.data;

  try {
    await transaction(async (client) => {
      const accessResult = await client.query<{
        account_type: AccountType;
        is_primary: boolean;
      }>(
        `
        SELECT p.account_type, uba.is_primary
        FROM profile p
        JOIN user_brand_access uba ON uba.profile_id = p.id
        WHERE p.id = $1
          AND uba.brand_id = $2
          AND uba.is_active = true
        LIMIT 1
        `,
        [data.profileId, data.brandId],
      );
      const access = accessResult.rows[0];

      if (!access) {
        throw new Error("Active brand access was not found.");
      }

      if (isEmployeeAccountType(access.account_type)) {
        const remainingResult = await client.query<{ remaining_count: number }>(
          `
          SELECT COUNT(*)::integer AS remaining_count
          FROM user_brand_access
          WHERE profile_id = $1
            AND brand_id <> $2
            AND is_active = true
          `,
          [data.profileId, data.brandId],
        );
        const remainingCount = remainingResult.rows[0]?.remaining_count ?? 0;

        if (remainingCount < 1) {
          throw new Error(
            "CLIENT and EMPLOYEE accounts need at least one active brand.",
          );
        }
      }

      await client.query(
        `
        UPDATE user_brand_access
        SET is_active = false,
            is_primary = false,
            revoked_at = now(),
            updated_at = now()
        WHERE profile_id = $1
          AND brand_id = $2
        `,
        [data.profileId, data.brandId],
      );

      const updatedAccountType = await recomputeProfileAccess(
        client,
        data.profileId,
      );

      if (isEmployeeAccountType(updatedAccountType) && access.is_primary) {
        await client.query(
          `
          UPDATE user_brand_access
          SET is_primary = true,
              updated_at = now()
          WHERE id = (
            SELECT id
            FROM user_brand_access
            WHERE profile_id = $1
              AND is_active = true
            ORDER BY granted_at ASC
            LIMIT 1
          )
          `,
          [data.profileId],
        );
      }

      const summaryResult = await client.query<ProfileAccessSummary>(
        `
        SELECT
          p.account_type,
          COUNT(uba.id) FILTER (WHERE uba.is_active = true)::integer AS active_count,
          COUNT(uba.id) FILTER (
            WHERE uba.is_active = true AND uba.is_primary = true
          )::integer AS active_primary_count
        FROM profile p
        LEFT JOIN user_brand_access uba ON uba.profile_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
        LIMIT 1
        `,
        [data.profileId],
      );
      const validationError = validateEmployeeAccessSummary(
        summaryResult.rows[0],
      );

      if (validationError) {
        throw new Error(validationError);
      }
    });

    revalidatePath(ACCOUNT_CONTROL_PATH);
    const actor = await getCurrentProfileContext();

    if (actor) {
      await createAccountControlLog({
        actorProfileId: actor.profile.id,
        targetProfileId: data.profileId,
        action: "BRAND_ACCESS_UPDATED",
        summary: "Brand access was revoked.",
        metadata: {
          brandId: data.brandId,
          isActive: false,
        },
      });
    }

    return {
      success: true,
      message: "Brand access removed successfully.",
    };
  } catch (error) {
    console.error("removeBrandAccess failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected server action error.",
    };
  }
}

export async function forceChangeAccountPassword(
  input: unknown,
): Promise<ActionResult> {
  const parsed = forceChangePasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid password details.",
    };
  }

  const authorization = await authorizeSensitiveAccountAction(
    parsed.data.profileId,
  );

  if (authorization.error) {
    return authorization.error;
  }

  const rateLimit = await enforceRateLimit({
    bucket: "account:force-password",
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  let defaultPassword: string;

  try {
    defaultPassword = getDefaultAccountPassword();
  } catch {
    return {
      success: false,
      message:
        "Default account password is not configured. Set DEFAULT_ACCOUNT_PASSWORD on the server.",
    };
  }

  try {
    await auth.api.setUserPassword({
      body: {
        userId: authorization.target.auth_user_id,
        newPassword: defaultPassword,
      },
      headers: await headers(),
    });

    await transaction(async (client) => {
      await client.query(
        `
        UPDATE profile
        SET
          must_change_password = $2,
          password_changed_at = now(),
          updated_at = now()
        WHERE id = $1
        `,
        [parsed.data.profileId, parsed.data.requirePasswordChange],
      );

      await client.query(
        `
        INSERT INTO account_control_logs (
          actor_profile_id,
          target_profile_id,
          action,
          summary,
          metadata
        )
        VALUES ($1, $2, 'PASSWORD_RESET_TO_DEFAULT', $3, $4::jsonb)
        `,
        [
          authorization.context.profile.id,
          parsed.data.profileId,
          "Password was reset to the system default password.",
          JSON.stringify({
            requirePasswordChange: parsed.data.requirePasswordChange,
            reason: parsed.data.reason,
            resetType: "DEFAULT_PASSWORD",
            targetFullName: authorization.target.full_name,
            targetAccountType: authorization.target.account_type,
          }),
        ],
      );
    });

    await revokeAuthSessionsIfPossible(authorization.target.auth_user_id);
    revalidatePath(ACCOUNT_CONTROL_PATH);

    return {
      success: true,
      message: "Password reset to the system default successfully.",
    };
  } catch (error) {
    console.error("forceChangeAccountPassword failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to reset password to default.",
    };
  }
}

async function ensureCanSoftDeleteTarget(
  actorProfileId: number,
  target: AccountActionProfileRow,
) {
  if (actorProfileId === target.id) {
    return "You cannot soft delete your own account.";
  }

  if (
    target.account_type === "FULL_STACK_DEVELOPER" ||
    target.account_type === "SUPERVISOR" ||
    target.account_type === "MANAGER" ||
    target.account_type === "DIRECTOR" ||
    target.account_type === "EXECUTIVE"
  ) {
    const remainingResult = await query<{ remaining_count: number }>(
      `
      SELECT COUNT(*)::integer AS remaining_count
      FROM profile
      WHERE status = 'ACTIVE'
        AND id <> $1
        AND account_type IN (
          'FULL_STACK_DEVELOPER',
          'SUPERVISOR',
          'MANAGER',
          'DIRECTOR',
          'EXECUTIVE'
        )
      `,
      [target.id],
    );

    if ((remainingResult.rows[0]?.remaining_count ?? 0) < 1) {
      return "At least one active full-access admin account must remain.";
    }
  }

  if (target.account_type === "FULL_STACK_DEVELOPER") {
    const remainingFullStackResult = await query<{ remaining_count: number }>(
      `
      SELECT COUNT(*)::integer AS remaining_count
      FROM profile
      WHERE status = 'ACTIVE'
        AND id <> $1
        AND account_type = 'FULL_STACK_DEVELOPER'
      `,
      [target.id],
    );

    if ((remainingFullStackResult.rows[0]?.remaining_count ?? 0) < 1) {
      return "At least one active Full Stack Developer account must remain.";
    }
  }

  return null;
}

export async function softDeleteAccount(input: unknown): Promise<ActionResult> {
  const parsed = softDeleteAccountSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid account.",
    };
  }

  const authorization = await authorizeSensitiveAccountAction(
    parsed.data.profileId,
  );

  if (authorization.error) {
    return authorization.error;
  }

  const safetyError = await ensureCanSoftDeleteTarget(
    authorization.context.profile.id,
    authorization.target,
  );

  if (safetyError) {
    return {
      success: false,
      message: safetyError,
    };
  }

  const rateLimit = await enforceRateLimit({
    bucket: "account:soft-delete",
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  try {
    const deletedAt = new Date().toISOString();

    await transaction(async (client) => {
      await client.query(
        `
        UPDATE profile
        SET
          status = 'DELETED',
          deleted_at = now(),
          deleted_by_profile_id = $2,
          deleted_reason = $3,
          updated_at = now()
        WHERE id = $1
        `,
        [
          parsed.data.profileId,
          authorization.context.profile.id,
          parsed.data.reason,
        ],
      );

      await client.query(
        `
        INSERT INTO account_control_logs (
          actor_profile_id,
          target_profile_id,
          action,
          summary,
          metadata
        )
        VALUES ($1, $2, 'ACCOUNT_SOFT_DELETED', $3, $4::jsonb)
        `,
        [
          authorization.context.profile.id,
          parsed.data.profileId,
          `Account was soft deleted for ${authorization.target.full_name}.`,
          JSON.stringify({
            reason: parsed.data.reason,
            previousStatus: authorization.target.status,
            newStatus: "DELETED",
            deletedAt,
            deletedBy: authorization.context.profile.id,
          }),
        ],
      );
    });

    await revokeAuthSessionsIfPossible(authorization.target.auth_user_id);
    revalidatePath(ACCOUNT_CONTROL_PATH);

    return {
      success: true,
      message: "Account soft deleted successfully.",
    };
  } catch (error) {
    console.error("softDeleteAccount failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to soft delete account.",
    };
  }
}
