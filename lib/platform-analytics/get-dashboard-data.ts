import "server-only"

import { loadMetaPlatformSlice } from "@/lib/platform-analytics/adapters/meta-adapter"
import { buildDemoPlatformSlice } from "@/lib/platform-analytics/demo-data"
import { getDemoCharts } from "@/lib/platform-analytics/platform-charts"
import type {
  AnalyticsPlatform,
  MetaScope,
  PlatformAnalyticsDashboardData,
  PlatformCode,
} from "@/lib/platform-analytics/types"

export async function getPlatformAnalyticsDashboardData(input?: {
  platform?: AnalyticsPlatform
  accountId?: string | null
  metaScope?: MetaScope
}): Promise<PlatformAnalyticsDashboardData> {
  const platform: AnalyticsPlatform = input?.platform ?? "META"
  const accountId = input?.accountId ?? null
  const metaScope = input?.metaScope ?? "combined"

  if (platform === "TIKTOK" || platform === "YOUTUBE" || platform === "GOOGLE") {
    const demo = buildDemoPlatformSlice(platform)
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
    }
  }

  const meta = await loadMetaPlatformSlice(accountId)

  return {
    platform: "META",
    accountId,
    isDemo: false,
    accounts: meta.accounts,
    connection: meta.connection,
    overviewKpis: meta.overviewKpis,
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
  }
}

export function isDemoPlatform(platform: PlatformCode) {
  return platform !== "META"
}
