import "server-only"

import { getMetaIntegrationStatus } from "@/lib/meta/connection-status"
import { getMetaAppSecret, isMetaWebhookConfigured } from "@/lib/meta/config"
import { getMetaMonitoringDashboardData } from "@/lib/meta/monitoring-data"
import { liveMetric, liveText } from "@/lib/platform-analytics/format"
import { buildMetaCharts } from "@/lib/platform-analytics/platform-charts"
import type {
  ActivityLogRow,
  ContentPerformanceRow,
  GrowthSnapshotRow,
  KpiMetric,
  MetaScope,
  PlatformAccount,
  PlatformConnectionStatus,
  SyncLogRow,
} from "@/lib/platform-analytics/types"

export async function loadMetaPlatformSlice(accountId: string | null) {
  const meta = await getMetaMonitoringDashboardData(accountId)
  const integration = await getMetaIntegrationStatus()
  const webhookOk = isMetaWebhookConfigured()
  const appSecretOk = Boolean(getMetaAppSecret())

  const accounts: PlatformAccount[] = meta.pages.map((page) => ({
    id: page.facebook_page_id,
    platform: "META",
    accountType: "facebook_page",
    accountName: page.page_name,
    externalAccountId: page.facebook_page_id,
    isDemo: false,
    lastSyncedAt: page.last_synced_at
      ? new Date(page.last_synced_at).toISOString()
      : null,
  }))

  const connection: PlatformConnectionStatus = {
    platform: "META",
    isDemo: false,
    apiConnected: integration.graphTokenConfigured,
    webhookSupported: true,
    webhookConfigured: integration.webhookConfigured,
    cronConfigured: integration.cronConfigured,
    connectedAccountsCount: integration.connectedPageCount,
    lastSyncAt: integration.lastSyncAt,
    lastSyncError: integration.lastSyncError,
    tokenStatus: integration.graphTokenConfigured ? "OK" : "Missing",
    syncHealth: integration.lastSyncError
      ? "Failed"
      : integration.needsBootstrap
        ? "Needs sync"
        : "OK",
    statusRows: [
      {
        label: "Graph API status",
        ok: integration.graphTokenConfigured,
        detail: integration.graphTokenConfigured ? "Connected" : "Not connected",
      },
      {
        label: "Webhook status",
        ok: webhookOk,
        detail: webhookOk ? "Verified" : "Not connected",
      },
      {
        label: "App secret status",
        ok: appSecretOk,
        detail: appSecretOk ? "Configured" : "Missing",
      },
      {
        label: "Page access token status",
        ok: integration.graphTokenConfigured,
        detail: integration.graphTokenConfigured ? "OK" : "Missing",
      },
      {
        label: "Connected Facebook pages",
        ok: integration.connectedPageCount > 0,
        detail: String(integration.connectedPageCount),
      },
      {
        label: "Connected Instagram accounts",
        ok: false,
        detail: "0",
      },
      {
        label: "Last sync",
        ok: Boolean(integration.lastSyncAt),
        detail: integration.lastSyncAt
          ? new Date(integration.lastSyncAt).toLocaleString("en-PH")
          : "Never",
      },
      {
        label: "Cron status",
        ok: integration.cronConfigured,
        detail: integration.cronConfigured ? "OK" : "Missing",
      },
    ],
  }

  const { pageAnalytics, socialMonitoring } = meta
  const pageInsights = pageAnalytics.pageInsights
  const topPost = meta.topPosts[0]

  const overviewKpis: KpiMetric[] = [
    {
      label: "Total followers",
      value: liveMetric(pageAnalytics.totalFollowers),
      metaScope: "combined",
    },
    {
      label: "Facebook page likes",
      value: liveMetric(pageAnalytics.pageLikes),
      metaScope: "facebook",
    },
    {
      label: "Instagram followers",
      value: "No live data yet",
      metaScope: "instagram",
    },
    {
      label: "New followers",
      value: liveMetric(pageAnalytics.newFollowers),
      metaScope: "combined",
    },
    {
      label: "Post engagements",
      value: liveMetric(
        pageAnalytics.totalReactions +
          pageAnalytics.totalComments +
          pageAnalytics.totalShares
      ),
      metaScope: "combined",
    },
    {
      label: "Reactions",
      value: liveMetric(pageAnalytics.totalReactions),
      metaScope: "combined",
    },
    {
      label: "Comments",
      value: liveMetric(pageAnalytics.totalComments),
      metaScope: "combined",
    },
    {
      label: "Shares",
      value: liveMetric(pageAnalytics.totalShares),
      metaScope: "combined",
    },
    {
      label: "Reach",
      value: liveMetric(pageInsights.pageImpressions),
      metaScope: "combined",
    },
    {
      label: "Impressions",
      value: liveMetric(pageInsights.pageImpressionsUnique),
      metaScope: "combined",
    },
    {
      label: "Profile visits",
      value: liveMetric(pageInsights.pageViewsTotal),
      metaScope: "combined",
    },
    {
      label: "Link clicks",
      value: "No live data yet",
      metaScope: "combined",
    },
    {
      label: "Top performing post",
      value: topPost?.message
        ? liveText(topPost.message.slice(0, 48))
        : "No live data yet",
      metaScope: "combined",
    },
    {
      label: "24-hour webhook comments",
      value: socialMonitoring.newComments,
      metaScope: "combined",
    },
    {
      label: "24-hour webhook reactions",
      value: socialMonitoring.newReactions,
      metaScope: "combined",
    },
  ]

  const engagementKpis: KpiMetric[] = [
    { label: "Reactions", value: liveMetric(pageAnalytics.totalReactions) },
    { label: "Comments", value: liveMetric(pageAnalytics.totalComments) },
    { label: "Shares", value: liveMetric(pageAnalytics.totalShares) },
    {
      label: "Post engagements (day)",
      value: liveMetric(pageInsights.pagePostEngagements),
    },
    { label: "Engaged users (day)", value: liveMetric(pageInsights.pageEngagedUsers) },
  ]

  const audienceInsightKpis: KpiMetric[] = [
    { label: "Page impressions (day)", value: liveMetric(pageInsights.pageImpressions) },
    {
      label: "Unique impressions (day)",
      value: liveMetric(pageInsights.pageImpressionsUnique),
    },
    { label: "New fans (day)", value: liveMetric(pageInsights.pageFanAdds) },
    { label: "Page views (day)", value: liveMetric(pageInsights.pageViewsTotal) },
  ]

  const growthSnapshots: GrowthSnapshotRow[] = pageAnalytics.growthSnapshots.map(
    (row) => ({
      id: row.id,
      date: row.snapshot_date,
      followers: row.followers_count,
      secondaryLabel: "Page likes",
      secondaryValue: row.page_likes,
    })
  )

  const contentPerformance: ContentPerformanceRow[] = meta.topPosts.map((post) => {
    const insights = post.insights as Record<string, unknown> | undefined
    const parsed = insights?.parsed as Record<string, number> | undefined
    return {
      id: post.id,
      rank: post.performance_rank,
      title: post.message || "Untitled post",
      publishedAt: post.published_at
        ? new Date(post.published_at).toISOString()
        : null,
      views: null,
      likes: post.reactions_count,
      comments: post.comments_count,
      shares: post.shares_count,
      engagementRate: post.engagement_rate,
      impressions: parsed?.post_impressions ?? null,
      engaged: parsed?.post_engaged_users ?? null,
      clicks: parsed?.post_clicks ?? null,
      watchTime: null,
      avgViewDuration: null,
      profileVisits: null,
      source: "Live",
      link: post.permalink,
      isDemo: false,
    }
  })

  const activityLogs: ActivityLogRow[] = meta.recentEvents.map((event) => ({
    id: event.id,
    platform: "META",
    eventType: event.event_type ?? event.field_name ?? "event",
    status: event.processing_status,
    receivedAt: new Date(event.received_at).toISOString(),
    summary: `Account ${event.page_id ?? "—"} · Post ${event.post_id ?? "—"}`,
    isDemo: false,
  }))

  const syncHistory: SyncLogRow[] = meta.recentSyncRuns.map((run) => ({
    id: run.id,
    platform: "META",
    syncType: run.sync_type,
    accountId: run.facebook_page_id,
    status: run.status,
    startedAt: new Date(run.started_at).toISOString(),
    recordsSynced: run.records_affected,
    errorMessage: run.error_log,
    isDemo: false,
  }))

  return {
    accounts,
    connection,
    overviewKpis,
    engagementKpis,
    audienceInsightKpis,
    growthSnapshots,
    contentPerformance,
    campaignPerformance: [],
    activityLogs,
    syncHistory,
    charts: buildMetaCharts(growthSnapshots),
    metaNeedsBootstrap: integration.needsBootstrap,
  }
}

export function metaAccountIdFromFilter(accountId: string | null) {
  if (!accountId || accountId === "all") {
    return null
  }
  return accountId
}

export function filterMetaKpisByScope(kpis: KpiMetric[], scope: MetaScope) {
  if (scope === "combined") {
    return kpis
  }
  if (scope === "facebook") {
    return kpis.filter((kpi) => kpi.metaScope !== "instagram")
  }
  return kpis.filter((kpi) => kpi.metaScope !== "facebook")
}
