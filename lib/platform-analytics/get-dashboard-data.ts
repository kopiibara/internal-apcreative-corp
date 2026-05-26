import "server-only";

import {
  filterMetaKpisByScope,
  loadMetaPlatformSlice,
  metaAccountIdFromFilter,
} from "@/lib/platform-analytics/adapters/meta-adapter";
import {
  loadYouTubePlatformSlice,
  youtubeAccountIdFromFilter,
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
}): Promise<PlatformAnalyticsDashboardData> {
  const platform: AnalyticsPlatform = input?.platform ?? "META";
  const accountId = input?.accountId ?? null;


  if (
    platform === "TIKTOK" ||
    platform === "YOUTUBE" ||
    platform === "GOOGLE"
  ) {
    // For non-Meta platforms, prefer live data where available (YouTube supported),
    // otherwise fall back to demo data.
    if (platform === "YOUTUBE") {
      const youtube = await loadYouTubePlatformSlice(
        youtubeAccountIdFromFilter(accountId),
        input?.dateRange,
      );
      return {
        platform,
        accountId,
        ...youtube,
        metaBusinessPages: [],
      };
    }

    const demo = buildDemoPlatformSlice(platform);
    return {
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
    };
  }

  const meta = await loadMetaPlatformSlice(metaAccountIdFromFilter(accountId), {
    dateRange: input?.dateRange,
    customDateFrom: input?.customDateFrom,
    customDateTo: input?.customDateTo,
  });

  return {
    platform: "META",
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
  };
}

export function isDemoPlatform(platform: PlatformCode) {
  return platform !== "META";
}
