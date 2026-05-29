import "server-only";

import { bootstrapMetaMonitoring } from "@/lib/meta/bootstrap";
import type { AccountType } from "@/lib/auth/account-type";
import {
  canManagePlatformAnalytics,
  canViewPlatformAnalytics,
} from "@/lib/platform-analytics/access";
import {
  getPlatformAnalyticsBrandScope,
  toPlatformAnalyticsBrandScopeUi,
} from "@/lib/platform-analytics/brand-scope";
import { getPlatformAnalyticsDashboardData } from "@/lib/platform-analytics/get-dashboard-data";
import { redirect } from "next/navigation";

type PlatformAnalyticsProfile = {
  id: number;
  auth_user_id: string;
  account_type: AccountType;
};

export type PlatformAnalyticsPageOptions = {
  profile: PlatformAnalyticsProfile;
  analyticsBasePath: "/admin/platform-analytics" | "/employee/platform-analytics";
  unauthorizedPath: string;
};

export async function loadPlatformAnalyticsPage({
  profile,
  analyticsBasePath,
  unauthorizedPath,
}: PlatformAnalyticsPageOptions) {
  const allowed = await canViewPlatformAnalytics(
    profile.auth_user_id,
    profile.id,
    profile.account_type,
  );

  if (!allowed) {
    redirect(unauthorizedPath);
  }

  const canManage = await canManagePlatformAnalytics(profile.auth_user_id);

  let initialData = await getPlatformAnalyticsDashboardData({
    platform: "META",
    accountId: null,
    metaScope: "combined",
    profileId: profile.id,
  });

  const brandScope = await getPlatformAnalyticsBrandScope(profile.id);
  const brandScopeUi = await toPlatformAnalyticsBrandScopeUi(
    brandScope,
    initialData.metaBusinessPages,
    profile.id,
  );

  let bootstrapMessage: string | null = null;

  if (
    canManage &&
    initialData.metaNeedsBootstrap &&
    initialData.platform === "META"
  ) {
    try {
      const result = await bootstrapMetaMonitoring();
      initialData = await getPlatformAnalyticsDashboardData({
        platform: "META",
        accountId: null,
        metaScope: "combined",
        profileId: profile.id,
      });
      bootstrapMessage =
        result.dailySnapshots > 0 || result.postMetrics > 0
          ? `Auto-connected ${result.registeredCount} Meta account(s) and synced analytics.`
          : result.errors[0] ??
            "Accounts registered. Run sync again if analytics are still empty.";
    } catch (error) {
      bootstrapMessage =
        error instanceof Error
          ? error.message
          : "Auto-connect failed. Use Connect & sync manually.";
    }
  }

  return {
    initialData,
    canManage,
    bootstrapMessage,
    brandScopeUi,
    analyticsBasePath,
  };
}
