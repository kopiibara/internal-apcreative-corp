import "server-only";

import { redirect } from "next/navigation";

import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { isAdminAccountType } from "@/lib/auth/account-type";
import { getEffectiveBrandAccessForProfile } from "@/lib/brand-access/effective-brand-access";
import { can } from "@/lib/permissions";

/** Role permissions that explicitly unlock Platform Analytics. */
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

/** Any active brand assignment (or All Brand expansion) unlocks employee analytics. */
async function hasBrandAssignmentForPlatformAnalytics(profileId: number) {
  const brands = await getEffectiveBrandAccessForProfile(profileId);
  return brands.length > 0;
}

export async function canViewPlatformAnalytics(
  authUserId: string,
  profileId?: number,
) {
  if (await hasPlatformAnalyticsRolePermission(authUserId)) {
    return true;
  }

  if (profileId == null) {
    return false;
  }

  return hasBrandAssignmentForPlatformAnalytics(profileId);
}

export async function canManagePlatformAnalytics(authUserId: string) {
  return (
    (await can(authUserId, "meta_monitoring.manage")) ||
    (await can(authUserId, "platform_analytics.manage"))
  );
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
  );

  if (!allowed) {
    const basePath = isAdminAccountType(context.profile.account_type)
      ? "/admin/unauthorized"
      : "/employee/unauthorized";

    redirect(`${basePath}?permission=platform_analytics.view`);
  }

  return context;
}
