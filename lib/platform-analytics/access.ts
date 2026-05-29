import "server-only";

import { redirect } from "next/navigation";

import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { isAdminAccountType } from "@/lib/auth/account-type";
import { can } from "@/lib/permissions";

/** Permissions that unlock the employee Platform Analytics sidebar and page. */
const PLATFORM_ANALYTICS_VIEW_KEYS = [
  "meta_monitoring.view",
  "platform_analytics.view",
  // Brand Officer and related roles receive this from seed migrations.
  "analytics.view",
] as const;

export async function canViewPlatformAnalytics(authUserId: string) {
  const checks = await Promise.all(
    PLATFORM_ANALYTICS_VIEW_KEYS.map((key) => can(authUserId, key)),
  );

  return checks.some(Boolean);
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

  const allowed = await canViewPlatformAnalytics(context.profile.auth_user_id);

  if (!allowed) {
    const basePath = isAdminAccountType(context.profile.account_type)
      ? "/admin/unauthorized"
      : "/employee/unauthorized";

    redirect(`${basePath}?permission=platform_analytics.view`);
  }

  return context;
}
