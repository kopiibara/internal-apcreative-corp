import "server-only";

import { bootstrapMetaMonitoring } from "@/lib/meta/bootstrap";
import type { AccountType } from "@/lib/auth/account-type";
import {
  canManagePlatformAnalytics,
  canShowAdminPlatformAnalyticsSyncActions,
  canViewPlatformAnalytics,
} from "@/lib/platform-analytics/access";
import {
  getPlatformAnalyticsBrandScope,
  toPlatformAnalyticsBrandScopeUi,
} from "@/lib/platform-analytics/brand-scope";
import { getPlatformAnalyticsDashboardData } from "@/lib/platform-analytics/get-dashboard-data";
import type { AnalyticsPlatform } from "@/lib/platform-analytics/types";
import { redirect } from "next/navigation";

function parseInitialPlatform(value?: string | null): AnalyticsPlatform {
  if (value === "YOUTUBE" || value === "TIKTOK" || value === "GOOGLE") {
    return value;
  }
  return "META";
}

type PlatformAnalyticsProfile = {
  id: number;
  auth_user_id: string;
  account_type: AccountType;
};

export type PlatformAnalyticsPageOptions = {
  profile: PlatformAnalyticsProfile;
  analyticsBasePath: "/admin/platform-analytics" | "/employee/platform-analytics";
  unauthorizedPath: string;
  initialPlatform?: AnalyticsPlatform;
};

export async function loadPlatformAnalyticsPage({
  profile,
  analyticsBasePath,
  unauthorizedPath,
  initialPlatform: initialPlatformOption,
}: PlatformAnalyticsPageOptions) {
  const allowed = await canViewPlatformAnalytics(
    profile.auth_user_id,
    profile.id,
    profile.account_type,
  );

  if (!allowed) {
    redirect(unauthorizedPath);
  }

  const [canManage, showAdminSyncActions] = await Promise.all([
    canManagePlatformAnalytics(profile.auth_user_id),
    canShowAdminPlatformAnalyticsSyncActions(
      profile.auth_user_id,
      profile.account_type,
      profile.id,
      analyticsBasePath,
    ),
  ]);

  const initialPlatform = parseInitialPlatform(initialPlatformOption);

  let initialData = await getPlatformAnalyticsDashboardData({
    platform: initialPlatform,
    accountId: null,
    metaScope: "combined",
    profileId: profile.id,
  });

  const brandScope = await getPlatformAnalyticsBrandScope(profile.id);
  const brandScopeUi = await toPlatformAnalyticsBrandScopeUi(
    brandScope,
    initialData.metaBusinessPages,
    profile.id,
    initialData.youtubeChannelAnalytics ?? [],
  );

  let bootstrapMessage: string | null = null;

  if (
    showAdminSyncActions &&
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
    initialPlatform,
    canManage,
    showAdminSyncActions,
    bootstrapMessage,
    brandScopeUi,
    analyticsBasePath,
  };
}
