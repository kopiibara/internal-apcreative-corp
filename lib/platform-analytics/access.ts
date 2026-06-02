import "server-only";

import { redirect } from "next/navigation";

import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import {
  hasAdminPermissionBypass,
  isAdminAccountType,
  type AccountType,
} from "@/lib/auth/account-type";
import { isFullStackDeveloperAccountType } from "@/lib/auth/full-stack-developer-access";
import {
  profileHasAllBrandsAccess,
  profileHasAssignedBrandAccess,
} from "@/lib/brand-access/effective-brand-access";
import { can } from "@/lib/permissions";

/** Role permissions that also unlock Platform Analytics explicitly. */
const PLATFORM_ANALYTICS_VIEW_KEYS = [
  "meta_monitoring.view",
  "platform_analytics.view",
  "analytics.view",
  "brands.analytics.view",
] as const;

async function hasPlatformAnalyticsRolePermission(authUserId: string) {
  const checks = await Promise.all(
    PLATFORM_ANALYTICS_VIEW_KEYS.map((key) => can(authUserId, key)),
  );

  return checks.some(Boolean);
}

/**
 * Platform Analytics access rules:
 * 1. Admin-tier accounts (supervisor/manager/executive/etc.) keep full access.
 * 2. Any account with at least one active real-brand assignment gets brand-scoped access.
 * 3. Otherwise fall back to explicit analytics role permissions.
 */
export async function canViewPlatformAnalytics(
  authUserId: string,
  profileId?: number,
  accountType?: string,
) {
  if (accountType && hasAdminPermissionBypass(accountType as never)) {
    return true;
  }

  if (profileId != null && (await profileHasAssignedBrandAccess(profileId))) {
    return true;
  }

  return hasPlatformAnalyticsRolePermission(authUserId);
}

export async function canManagePlatformAnalytics(authUserId: string) {
  return (
    (await can(authUserId, "meta_monitoring.manage")) ||
    (await can(authUserId, "platform_analytics.manage"))
  );
}

/**
 * Manual Platform Analytics sync/connect is restricted to Full Stack Developer only.
 *
 * Note: We keep the "all brands" requirement as an additional safety constraint,
 * since these actions can touch multiple integrations and write cross-brand data.
 */
export async function canSyncPlatformAnalytics(
  authUserId: string,
  accountType: AccountType,
  profileId: number,
) {
  if (!(await profileHasAllBrandsAccess(profileId))) {
    return false;
  }

  if (!isFullStackDeveloperAccountType(accountType)) {
    return false;
  }

  return true;
}

/** Sync/connect buttons on admin Platform Analytics only (all-brands users). */
export async function canShowAdminPlatformAnalyticsSyncActions(
  authUserId: string,
  accountType: AccountType,
  profileId: number,
  analyticsBasePath: "/admin/platform-analytics" | "/employee/platform-analytics",
) {
  if (analyticsBasePath.startsWith("/employee")) {
    return false;
  }

  return canSyncPlatformAnalytics(authUserId, accountType, profileId);
}

export async function requirePlatformAnalyticsView() {
  const context = await getCurrentProfileContext();

  if (!context) {
    redirect("/login");
  }

  if (context.profile.status !== "ACTIVE") {
    redirect("/login");
  }

  const allowed = await canViewPlatformAnalytics(
    context.profile.auth_user_id,
    context.profile.id,
    context.profile.account_type,
  );

  if (!allowed) {
    const basePath = isAdminAccountType(context.profile.account_type)
      ? "/admin/unauthorized"
      : "/employee/unauthorized";

    redirect(`${basePath}?permission=platform_analytics.view`);
  }

  return context;
}
