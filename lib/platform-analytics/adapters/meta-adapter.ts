import "server-only"

import { getMetaIntegrationStatus } from "@/lib/meta/connection-status"
import { getMetaAppSecret, isMetaWebhookConfigured } from "@/lib/meta/config"
import {
  getMetaBusinessPagesAnalytics,
  type MetaBusinessPageDashboard,
} from "@/lib/meta/page-analytics"
import { getMetaMonitoringDashboardData } from "@/lib/meta/monitoring-data"
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
  const [metaBusinessPages, meta, integration] = await Promise.all([
    getMetaBusinessPagesAnalytics({
      dateRange: options?.dateRange,
      customDateFrom: options?.customDateFrom,
      customDateTo: options?.customDateTo,
    }),
    getMetaMonitoringDashboardData(null),
    getMetaIntegrationStatus(),
  ])

  const webhookOk = isMetaWebhookConfigured()
  const appSecretOk = Boolean(getMetaAppSecret())

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
    webhookSupported: true,
    webhookConfigured: integration.webhookConfigured,
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
        label: "Enabled business pages",
        ok: metaBusinessPages.length > 0,
        detail: String(metaBusinessPages.length),
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
        label: "Cron status",
        ok: integration.cronConfigured,
        detail: integration.cronConfigured ? "OK" : "Missing",
      },
    ],
  }

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
    metaBusinessPages,
    overviewKpis: [],
    engagementKpis: [],
    audienceInsightKpis: [],
    growthSnapshots: [],
    contentPerformance: [],
    campaignPerformance: [],
    activityLogs,
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
