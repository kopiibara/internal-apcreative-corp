import "server-only"

import { query } from "@/lib/db"
import { getMetaIntegrationStatus } from "@/lib/meta/connection-status"
import { getConfiguredMetaPages } from "@/lib/meta/pages-config"
import {
  getMetaBusinessPagesAnalytics,
  type MetaBusinessPageDashboard,
} from "@/lib/meta/page-analytics"
import type { MetaSyncRunSummary } from "@/lib/meta/monitoring-data"
import type {
  ActivityLogRow,
  AnalyticsDateRange,
  KpiMetric,
  PlatformAccount,
  PlatformConnectionStatus,
  SyncLogRow,
} from "@/lib/platform-analytics/types"

export type MetaPlatformSlice = {
  accounts: PlatformAccount[]
  connection: PlatformConnectionStatus
  metaBusinessPages: MetaBusinessPageDashboard[]
  overviewKpis: KpiMetric[]
  engagementKpis: KpiMetric[]
  audienceInsightKpis: KpiMetric[]
  growthSnapshots: []
  contentPerformance: []
  campaignPerformance: []
  activityLogs: ActivityLogRow[]
  syncHistory: SyncLogRow[]
  charts: []
  metaNeedsBootstrap: boolean
}

export async function loadMetaPlatformSlice(
  _accountId: string | null,
  options?: {
    dateRange?: AnalyticsDateRange
    customDateFrom?: string | null
    customDateTo?: string | null
  }
): Promise<MetaPlatformSlice> {
  const [metaBusinessPages, integration] = await Promise.all([
    getMetaBusinessPagesAnalytics({
      dateRange: options?.dateRange,
      customDateFrom: options?.customDateFrom,
      customDateTo: options?.customDateTo,
    }),
    getMetaIntegrationStatus(),
  ])

  const pageIds = getConfiguredMetaPages().map((page) => page.pageId)

  const syncRunsResult =
    pageIds.length > 0
      ? await query<MetaSyncRunSummary>(
          `
    SELECT
      id,
      sync_type,
      facebook_page_id,
      status,
      started_at,
      finished_at,
      records_affected,
      error_log
    FROM meta_sync_run
    WHERE facebook_page_id = ANY($1::text[])
    ORDER BY started_at DESC
    LIMIT 100
    `,
          [pageIds]
        )
      : { rows: [] as MetaSyncRunSummary[] }

  const accounts: PlatformAccount[] = metaBusinessPages
    .filter((page) => page.facebookPageId)
    .map((page) => ({
      id: page.facebookPageId!,
      platform: "META",
      accountType: "facebook_page",
      accountName: page.pageName ?? page.displayName,
      externalAccountId: page.facebookPageId!,
      isDemo: false,
      lastSyncedAt: page.lastSyncAt,
    }))

  const connection: PlatformConnectionStatus = {
    platform: "META",
    isDemo: false,
    apiConnected: integration.graphTokenConfigured,
    webhookSupported: false,
    webhookConfigured: false,
    cronConfigured: integration.cronConfigured,
    connectedAccountsCount: metaBusinessPages.filter(
      (page) => page.connectionStatus === "Connected"
    ).length,
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
        label: "Configured Facebook pages",
        ok: metaBusinessPages.length > 0,
        detail: String(metaBusinessPages.length),
      },
      {
        label: "Pages with stored data",
        ok:
          integration.snapshotCount > 0 || integration.postMetricsCount > 0,
        detail: `${integration.snapshotCount} snapshots · ${integration.postMetricsCount} posts`,
      },
      {
        label: "Scheduled sync (cron)",
        ok: integration.cronConfigured,
        detail: integration.cronConfigured ? "OK" : "Not configured",
      },
    ],
  }

  const syncHistory: SyncLogRow[] = syncRunsResult.rows.map((run) => ({
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
    metaBusinessPages,
    overviewKpis: [],
    engagementKpis: [],
    audienceInsightKpis: [],
    growthSnapshots: [],
    contentPerformance: [],
    campaignPerformance: [],
    activityLogs: [],
    syncHistory,
    charts: [],
    metaNeedsBootstrap: integration.needsBootstrap,
  }
}

export function metaAccountIdFromFilter(_accountId: string | null) {
  return null
}

export function filterMetaKpisByScope(kpis: KpiMetric[]) {
  return kpis
}
