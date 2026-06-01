import "server-only";

import {
  type AccountType,
  isAdminAccountType,
} from "@/lib/auth/account-type";
import type { ProfileStatus } from "@/lib/auth/auth-session";
import { query } from "@/lib/db";

type PRPermissionProfile = {
  id: number;
  auth_user_id: string;
  account_type: AccountType;
  status: ProfileStatus;
};

const LEADERSHIP_ACCOUNT_TYPES: AccountType[] = [
  "EXECUTIVE",
  "MANAGER",
  "SUPERVISOR",
  "DIRECTOR",
];

async function getPRPermissionProfile(authUserId: string) {
  const result = await query<PRPermissionProfile>(
    `
    SELECT id, auth_user_id, account_type, status
    FROM profile
    WHERE auth_user_id = $1
    LIMIT 1
    `,
    [authUserId],
  );

  return result.rows[0] ?? null;
}

/** Role/override permission check without admin bypass. */
export async function hasExplicitPermission(
  authUserId: string,
  permissionKey: string,
) {
  const profile = await getPRPermissionProfile(authUserId);

  if (!profile || profile.status !== "ACTIVE") {
    return false;
  }

  const permissionResult = await query<{ id: number }>(
    `SELECT id FROM permission WHERE key = $1 LIMIT 1`,
    [permissionKey],
  );
  const permission = permissionResult.rows[0];

  if (!permission) {
    return false;
  }

  const checkResult = await query<{
    has_deny: boolean;
    has_allow: boolean;
    has_role_permission: boolean;
  }>(
    `
    SELECT
      EXISTS (
        SELECT 1
        FROM user_permission_override upo
        WHERE upo.profile_id = $1
          AND upo.permission_id = $2
          AND upo.effect = 'DENY'
          AND (upo.expires_at IS NULL OR upo.expires_at > now())
      ) AS has_deny,
      EXISTS (
        SELECT 1
        FROM user_permission_override upo
        WHERE upo.profile_id = $1
          AND upo.permission_id = $2
          AND upo.effect = 'ALLOW'
          AND (upo.expires_at IS NULL OR upo.expires_at > now())
      ) AS has_allow,
      EXISTS (
        SELECT 1
        FROM user_brand_access uba
        JOIN role_permission rp ON rp.role_id = uba.role_id
        WHERE uba.profile_id = $1
          AND uba.is_active = true
          AND rp.permission_id = $2
      ) AS has_role_permission
    `,
    [profile.id, permission.id],
  );

  const check = checkResult.rows[0];

  if (check?.has_deny) {
    return false;
  }

  return Boolean(check?.has_allow || check?.has_role_permission);
}

export function isPRAccountType(accountType: AccountType) {
  return accountType === "PR";
}

export function isLeadershipReadOnlyPRAccount(accountType: AccountType) {
  return LEADERSHIP_ACCOUNT_TYPES.includes(accountType);
}

export async function canAccessPRPage(profile: PRPermissionProfile) {
  if (profile.status !== "ACTIVE") {
    return false;
  }

  if (isPRAccountType(profile.account_type)) {
    return true;
  }

  if (isLeadershipReadOnlyPRAccount(profile.account_type)) {
    return true;
  }

  return (
    (await hasExplicitPermission(profile.auth_user_id, "pr_requests.view_all")) ||
    (await hasExplicitPermission(profile.auth_user_id, "pr_requests.read_only")) ||
    (await hasExplicitPermission(profile.auth_user_id, "pr_requests.manage")) ||
    (await hasExplicitPermission(profile.auth_user_id, "pr_requests.create"))
  );
}

export async function canCreatePRRequest(profile: PRPermissionProfile) {
  if (profile.status !== "ACTIVE") {
    return false;
  }

  if (isPRAccountType(profile.account_type)) {
    return true;
  }

  return hasExplicitPermission(profile.auth_user_id, "pr_requests.create");
}

export async function canManagePRRequests(profile: PRPermissionProfile) {
  if (profile.status !== "ACTIVE") {
    return false;
  }

  if (isPRAccountType(profile.account_type)) {
    return true;
  }

  return hasExplicitPermission(profile.auth_user_id, "pr_requests.manage");
}

export async function canReadOnlyPRRequests(profile: PRPermissionProfile) {
  if (profile.status !== "ACTIVE") {
    return false;
  }

  if (isLeadershipReadOnlyPRAccount(profile.account_type)) {
    return !(await canManagePRRequests(profile));
  }

  if (isAdminAccountType(profile.account_type)) {
    return (
      (await hasExplicitPermission(profile.auth_user_id, "pr_requests.read_only")) ||
      (await hasExplicitPermission(profile.auth_user_id, "pr_requests.view_all"))
    ) && !(await canManagePRRequests(profile));
  }

  return false;
}

export async function canViewAllPRRequests(profile: PRPermissionProfile) {
  if (profile.status !== "ACTIVE") {
    return false;
  }

  if (
    isPRAccountType(profile.account_type) ||
    isLeadershipReadOnlyPRAccount(profile.account_type)
  ) {
    return true;
  }

  return (
    (await hasExplicitPermission(profile.auth_user_id, "pr_requests.view_all")) ||
    (await hasExplicitPermission(profile.auth_user_id, "pr_requests.manage")) ||
    (await hasExplicitPermission(profile.auth_user_id, "pr_requests.read_only"))
  );
}

export async function getPRAccessFlags(authUserId: string) {
  const profile = await getPRPermissionProfile(authUserId);

  if (!profile) {
    return {
      canAccess: false,
      canCreate: false,
      canManage: false,
      canReadOnly: false,
      canReadOnlyMode: false,
      canViewAll: false,
      isPRAccount: false,
    };
  }

  const [canAccess, canCreate, canManage, canReadOnly, canViewAll] =
    await Promise.all([
      canAccessPRPage(profile),
      canCreatePRRequest(profile),
      canManagePRRequests(profile),
      canReadOnlyPRRequests(profile),
      canViewAllPRRequests(profile),
    ]);

  return {
    canAccess,
    canCreate,
    canManage,
    canReadOnly,
    canReadOnlyMode: canReadOnly && !canManage,
    canViewAll,
    isPRAccount: isPRAccountType(profile.account_type),
  };
}
