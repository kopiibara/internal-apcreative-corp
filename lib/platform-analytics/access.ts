import "server-only";

import { redirect } from "next/navigation";

import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { isAdminAccountType } from "@/lib/auth/account-type";
import { can } from "@/lib/permissions";

export async function canViewPlatformAnalytics(authUserId: string) {
  return (
    (await can(authUserId, "meta_monitoring.view")) ||
    (await can(authUserId, "platform_analytics.view"))
  );
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
