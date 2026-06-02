import "server-only";

import {
  applyBrandScopeToDashboardData,
  getPlatformAnalyticsBrandScope,
} from "@/lib/platform-analytics/brand-scope";
import {
  filterMetaKpisByScope,
  loadMetaPlatformSlice,
  metaAccountIdFromFilter,
} from "@/lib/platform-analytics/adapters/meta-adapter";
import {
  loadTikTokPlatformSlice,
  tiktokBrandIdFromFilter,
} from "@/lib/platform-analytics/adapters/tiktok-adapter";
import {
  loadYouTubePlatformSlice,
  youtubeChannelKeyFromFilter,
} from "@/lib/platform-analytics/adapters/youtube-adapter";
import { buildDemoPlatformSlice } from "@/lib/platform-analytics/demo-data";
import { getDemoCharts } from "@/lib/platform-analytics/platform-charts";
import type {
  AnalyticsPlatform,
  AnalyticsDateRange,
  MetaScope,
  PlatformAnalyticsDashboardData,
  PlatformCode,
} from "@/lib/platform-analytics/types";

export async function getPlatformAnalyticsDashboardData(input?: {
  platform?: AnalyticsPlatform;
  accountId?: string | null;
  metaScope?: MetaScope;
  dateRange?: AnalyticsDateRange;
  customDateFrom?: string | null;
  customDateTo?: string | null;
  profileId?: number | null;
}): Promise<PlatformAnalyticsDashboardData> {
  const platform: AnalyticsPlatform = input?.platform ?? "META";
  const accountId = input?.accountId ?? null;
  const brandScope =
    input?.profileId != null
      ? await getPlatformAnalyticsBrandScope(input.profileId)
      : null;

  if (
    platform === "TIKTOK" ||
    platform === "YOUTUBE" ||
    platform === "GOOGLE"
  ) {
    // For non-Meta platforms, prefer live data where available (YouTube supported),
    // otherwise fall back to demo data.
    if (platform === "YOUTUBE") {
      const youtube = await loadYouTubePlatformSlice(
        youtubeChannelKeyFromFilter(accountId),
        input?.dateRange,
      );
      const data = {
        platform,
        accountId,
        ...youtube,
        metaBusinessPages: [],
        tiktokBrandAnalytics: [],
        youtubeChannelAnalytics: youtube.youtubeChannelAnalytics,
      };

      return brandScope
        ? applyBrandScopeToDashboardData(data, brandScope)
        : data;
    }

    if (platform === "TIKTOK") {
      const tiktok = await loadTikTokPlatformSlice({
        profileId: input?.profileId ?? null,
        brandId: tiktokBrandIdFromFilter(accountId),
      });
      const data = {
        platform,
        accountId,
        ...tiktok,
        metaBusinessPages: [],
        youtubeChannelAnalytics: [],
      };

      return brandScope
        ? applyBrandScopeToDashboardData(data, brandScope)
        : data;
    }

    const demo = buildDemoPlatformSlice(platform);
    const data = {
      platform,
      accountId,
      isDemo: true,
      accounts: demo.accounts,
      connection: demo.connection,
      overviewKpis: demo.overviewKpis,
      engagementKpis: demo.engagementKpis,
      audienceInsightKpis: demo.audienceInsightKpis,
      growthSnapshots: demo.growthSnapshots,
      contentPerformance: demo.contentPerformance,
      campaignPerformance: demo.campaignPerformance,
      activityLogs: demo.activityLogs,
      syncHistory: demo.syncHistory,
      charts: getDemoCharts(platform),
      metaNeedsBootstrap: false,
      metaBusinessPages: [],
      tiktokBrandAnalytics: [],
      youtubeChannelAnalytics: [],
    };

    return brandScope ? applyBrandScopeToDashboardData(data, brandScope) : data;
  }

  const meta = await loadMetaPlatformSlice(metaAccountIdFromFilter(accountId), {
    dateRange: input?.dateRange,
    customDateFrom: input?.customDateFrom,
    customDateTo: input?.customDateTo,
  });

  const data = {
    platform: "META" as const,
    accountId,
    isDemo: false,
    accounts: meta.accounts,
    connection: meta.connection,
    overviewKpis: filterMetaKpisByScope(meta.overviewKpis),
    engagementKpis: meta.engagementKpis,
    audienceInsightKpis: meta.audienceInsightKpis,
    growthSnapshots: meta.growthSnapshots,
    contentPerformance: meta.contentPerformance,
    campaignPerformance: meta.campaignPerformance,
    activityLogs: meta.activityLogs,
    syncHistory: meta.syncHistory,
    charts: meta.charts,
    metaNeedsBootstrap: meta.metaNeedsBootstrap,
    metaBusinessPages: meta.metaBusinessPages,
    tiktokBrandAnalytics: [],
    youtubeChannelAnalytics: [],
  };

  return brandScope ? applyBrandScopeToDashboardData(data, brandScope) : data;
}

export function isDemoPlatform(platform: PlatformCode) {
  return platform === "GOOGLE";
}
