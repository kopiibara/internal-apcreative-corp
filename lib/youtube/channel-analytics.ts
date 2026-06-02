import "server-only";

import { query } from "@/lib/db";
import {
  getYouTubeLatestMetricMap,
  getYouTubeLiveMetricMap,
} from "@/lib/platform-analytics/youtube-sync";
import { formatWholeMetric } from "@/lib/platform-analytics/format";
import type { PlatformChartConfig } from "@/lib/platform-analytics/types";
import type { AnalyticsDateRange } from "@/lib/platform-analytics/types";
import type {
  ActivityLogRow,
  ContentPerformanceRow,
  GrowthSnapshotRow,
  KpiMetric,
  PlatformConnectionStatus,
  SyncLogRow,
} from "@/lib/platform-analytics/types";
import type {
  YouTubeChannelDashboard,
  YouTubeSourceSyncStatus,
} from "@/lib/youtube/channel-analytics-types";
import type { YouTubeChannelConfig } from "@/lib/youtube/channels-config";
import {
  getEnabledYouTubeChannels,
  getYouTubeChannelByKey,
} from "@/lib/youtube/channels-config";

type YouTubeTrendRow = {
  metric_date: string;
  metric_key: string;
  metric_value: number | string;
};

type YouTubeContentRow = {
  title: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  watchTime: string | null;
  avgViewDuration: string | null;
  publishedAt: string | null;
};

type PlatformIntegrationRow = {
  id: number;
  channel_key: string | null;
  external_account_id: string | null;
  account_name: string | null;
  token_reference: string | null;
  status: string;
  last_synced_at: string | null;
};

type GrowthSnapshotQueryRow = {
  metric_date: string;
  metric_value: number | string;
};

type ContentPerformanceQueryRow = {
  external_content_id: string;
  external_account_id: string;
  title: string | null;
  published_at: string | null;
  views_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  engagement_rate: number | string | null;
  insights: {
    watch_minutes?: number | null;
    average_view_duration_seconds?: number | null;
  } | null;
  thumbnail_url: string | null;
};

type ActivityLogQueryRow = {
  id: number;
  external_account_id: string | null;
  event_type: string | null;
  status: string | null;
  payload_summary: string | null;
  received_at: string;
};

type SyncLogQueryRow = {
  id: number;
  sync_type: string;
  external_account_id: string | null;
  status: string;
  started_at: string;
  records_synced: number | null;
  error_message: string | null;
};

const trendDateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
});

function formatTrendDateLabel(metricDate: string) {
  const parsed = new Date(`${metricDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return metricDate;
  }
  return trendDateFormatter.format(parsed);
}

function normalizeTrendKey(value: string | number | Date) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function youtubeVideoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

function dateRangeLabel(dateRange?: AnalyticsDateRange) {
  switch (dateRange) {
    case "today":
      return "Today";
    case "7d":
      return "Last 7 days";
    case "month":
      return "This month";
    case "90d":
      return "Last 90 days";
    case "365d":
      return "Last 365 days";
    case "custom":
      return "Custom range";
    case "28d":
    default:
      return "Last 28 days";
  }
}

function dateRangeLabelShort(dateRange?: AnalyticsDateRange) {
  return dateRangeLabel(dateRange).toLowerCase();
}

function dateRangeToDays(dateRange?: AnalyticsDateRange) {
  switch (dateRange) {
    case "today":
      return 1;
    case "7d":
      return 7;
    case "month": {
      const today = new Date();
      return today.getDate();
    }
    case "90d":
      return 90;
    case "365d":
      return 365;
    case "custom":
    case "28d":
    default:
      return 28;
  }
}

function dateRangeToStartOffset(dateRange?: AnalyticsDateRange) {
  return Math.max(dateRangeToDays(dateRange) - 1, 0);
}

function syncStatusFromLog(
  logs: SyncLogQueryRow[],
  accountId: string | null,
): YouTubeSourceSyncStatus {
  const latest = logs.find((row) => row.external_account_id === accountId);
  if (!latest) {
    return "never";
  }
  if (latest.status === "STARTED") {
    return "pending";
  }
  if (latest.status === "SUCCESS") {
    return "success";
  }
  return "failed";
}

function displaySyncStatus(status: YouTubeSourceSyncStatus) {
  switch (status) {
    case "success":
      return "Success";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
    case "missing_token":
      return "Not authorized";
    case "no_data":
      return "No data";
    case "never":
    default:
      return "Never";
  }
}

export function buildYouTubeCharts(
  trendRows: YouTubeTrendRow[],
  topVideos: YouTubeContentRow[],
  subscriberSnapshots: GrowthSnapshotRow[],
  dateRange?: AnalyticsDateRange,
  chartScopeLabel?: string,
): PlatformChartConfig[] {
  const periodLabel = dateRangeLabel(dateRange);
  const periodLabelShort = dateRangeLabelShort(dateRange);
  const scopeSuffix = chartScopeLabel ? ` (${chartScopeLabel})` : "";
  const trendMap = new Map<
    string,
    {
      label: string;
      views: number;
      watchTimeMinutes: number;
      subscribersTotal: number;
      subscribersNet: number;
    }
  >();

  for (const row of trendRows) {
    const entry = trendMap.get(row.metric_date) ?? {
      label: formatTrendDateLabel(row.metric_date),
      views: 0,
      watchTimeMinutes: 0,
      subscribersTotal: 0,
      subscribersNet: 0,
    };

    if (row.metric_key === "views") {
      entry.views = toNumber(row.metric_value);
    }
    if (row.metric_key === "watch_time_minutes") {
      entry.watchTimeMinutes = toNumber(row.metric_value);
    }
    if (row.metric_key === "subscribers_total") {
      entry.subscribersTotal = toNumber(row.metric_value);
    }
    if (row.metric_key === "subscribers_net") {
      entry.subscribersNet = toNumber(row.metric_value);
    }

    trendMap.set(row.metric_date, entry);
  }

  const trend = [...trendMap.entries()]
    .sort(([left], [right]) =>
      normalizeTrendKey(left).localeCompare(normalizeTrendKey(right)),
    )
    .map(([, value]) => value);

  const subscriberTrend = subscriberSnapshots.length
    ? [...subscriberSnapshots].reverse().map((row) => ({
        label: row.date,
        subscribers: row.followers ?? 0,
      }))
    : trend.map((row) => ({
        label: row.label,
        subscribers: row.subscribersTotal,
      }));

  const topVideoData = topVideos.slice(0, 5).map((row) => ({
    label: row.title.length > 24 ? `${row.title.slice(0, 21)}...` : row.title,
    views: row.views ?? 0,
    watchTimeMinutes: Number(row.watchTime?.match(/^(\d+)/)?.[1] ?? "0"),
  }));

  return [
    {
      id: "yt-views-trend",
      title: "Views trend",
      description: `${periodLabel} from YouTube Analytics${scopeSuffix}`,
      data: trend,
      keys: [{ key: "views", label: "Views", color: "var(--chart-1)" }],
      chartType: "line",
      valueFormat: "whole",
    },
    {
      id: "yt-subscribers-trend",
      title: "Subscribers growth",
      description: `Daily subscriber total snapshots (${periodLabelShort})${scopeSuffix}`,
      data: subscriberTrend,
      keys: [
        { key: "subscribers", label: "Subscribers", color: "var(--chart-2)" },
      ],
      chartType: "area",
      valueFormat: "whole",
    },
    {
      id: "yt-watch-time-trend",
      title: "Watch time trend",
      description: `Daily minutes watched (${periodLabelShort})${scopeSuffix}`,
      data: trend,
      keys: [
        {
          key: "watchTimeMinutes",
          label: "Watch time (minutes)",
          color: "var(--chart-3)",
        },
      ],
      chartType: "bar",
      valueFormat: "whole",
    },
    {
      id: "yt-subscriber-change",
      title: "Subscriber change",
      description: `Gained minus lost over ${periodLabelShort}${scopeSuffix}`,
      data: trend,
      keys: [
        {
          key: "subscribersNet",
          label: "Net subscribers",
          color: "var(--chart-4)",
        },
      ],
      chartType: "line",
      valueFormat: "whole",
    },
    {
      id: "yt-top-videos",
      title: "Top videos by views",
      description: `Live video performance from synced content rows (${periodLabelShort})${scopeSuffix}`,
      data: topVideoData,
      keys: [{ key: "views", label: "Views", color: "var(--chart-5)" }],
      chartType: "bar",
      valueFormat: "whole",
    },
  ];
}

function buildOverviewKpis(
  metricMap: Map<string, number>,
  dateRange?: AnalyticsDateRange,
): KpiMetric[] {
  const watchTimeMinutes = metricMap.get("watch_time_minutes");
  const avgSeconds = metricMap.get("avg_view_duration_seconds");
  const likes = metricMap.get("likes") ?? 0;
  const comments = metricMap.get("comments") ?? 0;
  const shares = metricMap.get("shares") ?? 0;
  const views = metricMap.get("views") ?? 0;
  const engagementTotal = likes + comments + shares;

  return [
    {
      label: "Subscribers",
      value: formatWholeMetric(metricMap.get("subscribers_total")),
      hint: "Current channel total",
    },
    {
      label: "Subscribers change",
      value: formatWholeMetric(metricMap.get("subscribers_net")),
      hint: `${dateRangeLabel(dateRange)} (gained - lost)`,
    },
    {
      label: "Views",
      value: formatWholeMetric(metricMap.get("views")),
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Watch time",
      value:
        watchTimeMinutes !== undefined
          ? `${formatWholeMetric(watchTimeMinutes)} minutes`
          : "No live data yet",
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Average view duration",
      value: avgSeconds
        ? `${Math.round(avgSeconds / 60)}m ${Math.round(avgSeconds % 60)}s`
        : "No live data yet",
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Likes",
      value: formatWholeMetric(metricMap.get("likes")),
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Comments",
      value: formatWholeMetric(metricMap.get("comments")),
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Shares",
      value: formatWholeMetric(metricMap.get("shares")),
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Engagement total",
      value: formatWholeMetric(engagementTotal),
      hint: "Likes + comments + shares",
    },
    {
      label: "Engagement rate",
      value:
        views > 0
          ? `${((engagementTotal / views) * 100).toFixed(2)}%`
          : "No live data yet",
      hint: dateRangeLabel(dateRange),
    },
  ];
}

function buildEngagementKpis(metricMap: Map<string, number>): KpiMetric[] {
  return [
    { label: "Likes", value: formatWholeMetric(metricMap.get("likes")) },
    { label: "Comments", value: formatWholeMetric(metricMap.get("comments")) },
    { label: "Shares", value: formatWholeMetric(metricMap.get("shares")) },
    {
      label: "Average view duration",
      value: metricMap.get("avg_view_duration_seconds")
        ? `${Math.round((metricMap.get("avg_view_duration_seconds") ?? 0) / 60)}m`
        : "No live data yet",
    },
  ];
}

function buildAudienceKpis(
  metricMap: Map<string, number>,
  dateRange?: AnalyticsDateRange,
): KpiMetric[] {
  const watchTimeMinutes = metricMap.get("watch_time_minutes");
  return [
    {
      label: "Subscribers",
      value: formatWholeMetric(metricMap.get("subscribers_total")),
      hint: "Current channel total",
    },
    {
      label: "Subscribers change (28d)",
      value: formatWholeMetric(metricMap.get("subscribers_net")),
      hint: `${dateRangeLabel(dateRange)} - gained minus lost`,
    },
    {
      label: "Watch time",
      value:
        watchTimeMinutes !== undefined
          ? `${formatWholeMetric(watchTimeMinutes)} minutes`
          : "No live data yet",
      hint: dateRangeLabel(dateRange),
    },
  ];
}

function buildUnconnectedChannelDashboard(
  config: YouTubeChannelConfig,
  syncLogs: SyncLogQueryRow[],
): YouTubeChannelDashboard {
  const statusMessage = config.enabled
    ? "This YouTube channel is not connected yet."
    : "Missing YouTube connection for this channel.";

  const emptyConnection: PlatformConnectionStatus = {
    platform: "YOUTUBE",
    isDemo: false,
    apiConnected: false,
    webhookSupported: true,
    webhookConfigured: false,
    cronConfigured: true,
    connectedAccountsCount: 0,
    lastSyncAt: null,
    lastSyncError: null,
    tokenStatus: "Missing",
    syncHealth: "Needs sync",
    statusRows: [
      { label: "YouTube webhook status", ok: false, detail: "Pending" },
      {
        label: "Channel connection",
        ok: false,
        detail: "Not connected",
      },
      {
        label: "Google OAuth status",
        ok: false,
        detail: "Not authorized",
      },
      { label: "Last sync", ok: false, detail: "Never" },
      {
        label: "Video sync",
        ok: false,
        detail: displaySyncStatus("never"),
      },
      {
        label: "Analytics sync",
        ok: false,
        detail: displaySyncStatus("never"),
      },
    ],
  };

  return {
    key: config.key,
    displayName: config.displayName,
    channelId: config.channelId || null,
    connectionStatus: "Not connected",
    oauthStatus: "Not authorized",
    lastSyncAt: null,
    videoSyncStatus: "missing_token",
    analyticsSyncStatus: "missing_token",
    statusMessage,
    overviewKpis: [],
    engagementKpis: [],
    audienceInsightKpis: [],
    growthSnapshots: [],
    contentPerformance: [],
    charts: [],
    activityLogs: [],
    syncHistory: syncLogs
      .filter((row) => false)
      .map((r) => ({
        id: r.id,
        platform: "YOUTUBE" as const,
        syncType: r.sync_type,
        accountId: r.external_account_id,
        status: r.status,
        startedAt: new Date(r.started_at).toISOString(),
        recordsSynced: r.records_synced ?? 0,
        errorMessage: r.error_message ?? null,
        isDemo: false,
      })),
    connection: emptyConnection,
  };
}

async function loadConnectedChannelDashboard(
  config: YouTubeChannelConfig,
  integration: PlatformIntegrationRow,
  syncLogs: SyncLogQueryRow[],
  activityLogsAll: ActivityLogQueryRow[],
  dateRange?: AnalyticsDateRange,
): Promise<YouTubeChannelDashboard> {
  const externalAccountId = integration.external_account_id ?? "";
  const startOffset = dateRangeToStartOffset(dateRange);

  let metricMap = new Map<string, number>();
  if (externalAccountId) {
    try {
      const liveMetricMap = await getYouTubeLiveMetricMap(
        externalAccountId,
        dateRange,
      );
      metricMap =
        liveMetricMap ??
        (await getYouTubeLatestMetricMap(externalAccountId));
    } catch {
      try {
        metricMap = await getYouTubeLatestMetricMap(externalAccountId);
      } catch {
        // fall back to empty
      }
    }
  }

  const growthRes = externalAccountId
    ? await query<GrowthSnapshotQueryRow>(
        `
        SELECT metric_date, metric_value::numeric
        FROM platform_metric_snapshot
        WHERE platform = 'YOUTUBE'
          AND metric_key = 'subscribers_total'
          AND external_account_id = $1
          AND metric_date >= (CURRENT_DATE - $2::int)
        ORDER BY metric_date DESC
        LIMIT 30
        `,
        [externalAccountId, startOffset],
      )
    : { rows: [] as GrowthSnapshotQueryRow[] };

  const contentRes = externalAccountId
    ? await query<ContentPerformanceQueryRow>(
        `
        SELECT external_content_id, external_account_id, title, published_at,
               views_count, likes_count, comments_count, shares_count,
               engagement_rate, insights, thumbnail_url
        FROM platform_content_performance
        WHERE platform = 'YOUTUBE'
          AND external_account_id = $1
        ORDER BY views_count DESC
        LIMIT 50
        `,
        [externalAccountId],
      )
    : { rows: [] as ContentPerformanceQueryRow[] };

  const trendRes = externalAccountId
    ? await query<YouTubeTrendRow>(
        `
        SELECT metric_date, metric_key, metric_value::numeric
        FROM platform_metric_snapshot
        WHERE platform = 'YOUTUBE'
          AND external_account_id = $1
          AND metric_key IN ('views', 'watch_time_minutes', 'subscribers_total', 'subscribers_net')
          AND metric_date >= (CURRENT_DATE - $2::int)
        ORDER BY metric_date ASC
        `,
        [externalAccountId, startOffset],
      )
    : { rows: [] as YouTubeTrendRow[] };

  const growthSnapshots: GrowthSnapshotRow[] = growthRes.rows
    .map((r, idx) => ({
      id: `yt-${config.key}-${idx}-${r.metric_date}`,
      date: String(r.metric_date),
      followers: Number(r.metric_value),
      secondaryLabel: "Views",
      secondaryValue: null,
    }))
    .reverse();

  const viewsByDate = new Map<string, number>();
  for (const row of trendRes.rows) {
    if (row.metric_key === "views") {
      viewsByDate.set(row.metric_date, toNumber(row.metric_value));
    }
  }

  const growthSnapshotsLive = growthSnapshots.map((row) => ({
    ...row,
    secondaryValue: viewsByDate.get(row.date) ?? null,
  }));

  const contentPerformance: ContentPerformanceRow[] = contentRes.rows.map(
    (r) => ({
      id: r.external_content_id,
      rank: null,
      title: r.title || "Untitled video",
      channelName: config.displayName,
      publishedAt: r.published_at
        ? new Date(r.published_at).toISOString()
        : null,
      views: r.views_count ?? null,
      likes: r.likes_count ?? 0,
      comments: r.comments_count ?? 0,
      shares: r.shares_count ?? 0,
      engagementRate:
        r.engagement_rate != null ? `${Number(r.engagement_rate).toFixed(2)}%` : null,
      impressions: null,
      engaged: null,
      clicks: null,
      watchTime: r.insights?.watch_minutes
        ? `${formatWholeMetric(r.insights.watch_minutes)} minutes`
        : null,
      avgViewDuration: r.insights?.average_view_duration_seconds
        ? `${Math.round((r.insights.average_view_duration_seconds ?? 0) / 60)}m ${Math.round((r.insights.average_view_duration_seconds ?? 0) % 60)}s`
        : null,
      profileVisits: null,
      source: "Synced",
      link: youtubeVideoUrl(r.external_content_id),
      isDemo: false,
    }),
  );

  const topVideoRows: YouTubeContentRow[] = contentPerformance.map((row) => ({
    title: row.title,
    views: row.views,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    watchTime: row.watchTime,
    avgViewDuration: row.avgViewDuration,
    publishedAt: row.publishedAt,
  }));

  const channelSyncLogs = syncLogs.filter(
    (row) => row.external_account_id === externalAccountId,
  );
  const videoSyncStatus = syncStatusFromLog(channelSyncLogs, externalAccountId);
  const analyticsSyncStatus = videoSyncStatus;

  const lastSyncAt = integration.last_synced_at
    ? new Date(integration.last_synced_at).toISOString()
    : null;

  const oauthOk = Boolean(integration.token_reference);
  const connection: PlatformConnectionStatus = {
    platform: "YOUTUBE",
    isDemo: false,
    apiConnected: oauthOk,
    webhookSupported: true,
    webhookConfigured: false,
    cronConfigured: true,
    connectedAccountsCount: 1,
    lastSyncAt,
    lastSyncError:
      integration.status === "ERROR" ? "YouTube sync failed for this channel." : null,
    tokenStatus: oauthOk ? "OK" : "Missing",
    syncHealth:
      integration.status === "ERROR"
        ? "Failed"
        : lastSyncAt
          ? "OK"
          : "Needs sync",
    statusRows: [
      { label: "YouTube webhook status", ok: false, detail: "Pending" },
      {
        label: "Channel connection",
        ok: true,
        detail: integration.account_name || config.displayName,
      },
      {
        label: "Google OAuth status",
        ok: oauthOk,
        detail: oauthOk ? "Authorized" : "Not authorized",
      },
      {
        label: "Last sync",
        ok: Boolean(lastSyncAt),
        detail: lastSyncAt ?? "Never",
      },
      {
        label: "Video sync",
        ok: videoSyncStatus === "success",
        detail: displaySyncStatus(videoSyncStatus),
      },
      {
        label: "Analytics sync",
        ok: analyticsSyncStatus === "success",
        detail: displaySyncStatus(analyticsSyncStatus),
      },
    ],
  };

  const activityLogs: ActivityLogRow[] = activityLogsAll
    .filter((row) => row.external_account_id === externalAccountId)
    .map((r) => ({
      id: r.id,
      platform: "YOUTUBE",
      eventType: r.event_type || "event",
      status: r.status || "",
      receivedAt: new Date(r.received_at).toISOString(),
      summary: r.payload_summary || "",
      isDemo: false,
    }));

  const syncHistory: SyncLogRow[] = channelSyncLogs.slice(0, 20).map((r) => ({
    id: r.id,
    platform: "YOUTUBE",
    syncType: r.sync_type,
    accountId: r.external_account_id,
    status: r.status,
    startedAt: new Date(r.started_at).toISOString(),
    recordsSynced: r.records_synced ?? 0,
    errorMessage: r.error_message ?? null,
    isDemo: false,
  }));

  const hasMetrics = metricMap.size > 0;
  const statusMessage =
    !oauthOk
      ? "Google OAuth authorization is required for this channel."
      : integration.status === "ERROR"
        ? "YouTube sync failed for this channel."
        : !hasMetrics
          ? "No YouTube analytics available yet."
          : null;

  return {
    key: config.key,
    displayName: config.displayName,
    channelId: externalAccountId || config.channelId || null,
    connectionStatus: oauthOk ? "Connected" : "Not connected",
    oauthStatus: oauthOk ? "Authorized" : "Not authorized",
    lastSyncAt,
    videoSyncStatus,
    analyticsSyncStatus,
    statusMessage,
    overviewKpis: hasMetrics ? buildOverviewKpis(metricMap, dateRange) : [],
    engagementKpis: hasMetrics ? buildEngagementKpis(metricMap) : [],
    audienceInsightKpis: hasMetrics
      ? buildAudienceKpis(metricMap, dateRange)
      : [],
    growthSnapshots: growthSnapshotsLive,
    contentPerformance,
    charts: buildYouTubeCharts(
      trendRes.rows,
      topVideoRows,
      growthSnapshotsLive,
      dateRange,
      config.displayName,
    ),
    activityLogs,
    syncHistory,
    connection,
  };
}

async function loadIntegrationsMap() {
  const integrationsRes = await query<PlatformIntegrationRow>(
    `
    SELECT id, channel_key, external_account_id, account_name, token_reference,
           status, last_synced_at
    FROM platform_integration
    WHERE platform = 'YOUTUBE'
      AND status IN ('ACTIVE', 'ERROR')
    ORDER BY updated_at DESC
    `,
    [],
  );

  const byChannelKey = new Map<string, PlatformIntegrationRow>();
  const byExternalId = new Map<string, PlatformIntegrationRow>();

  for (const row of integrationsRes.rows) {
    if (row.channel_key) {
      byChannelKey.set(row.channel_key, row);
    }
    if (row.external_account_id) {
      byExternalId.set(row.external_account_id, row);
    }
  }

  return { byChannelKey, byExternalId };
}

function resolveIntegrationForConfig(
  config: YouTubeChannelConfig,
  byChannelKey: Map<string, PlatformIntegrationRow>,
  byExternalId: Map<string, PlatformIntegrationRow>,
): PlatformIntegrationRow | null {
  const byKey = byChannelKey.get(config.key);
  if (byKey) {
    return byKey;
  }

  if (config.channelId) {
    const byId = byExternalId.get(config.channelId);
    if (byId) {
      return byId;
    }
  }

  return null;
}

export async function getYouTubeChannelsAnalytics(input?: {
  dateRange?: AnalyticsDateRange;
}): Promise<YouTubeChannelDashboard[]> {
  let enabledChannels = getEnabledYouTubeChannels();

  const [{ byChannelKey, byExternalId }, syncRes, logsRes] = await Promise.all([
    loadIntegrationsMap(),
    query<SyncLogQueryRow>(
      `
      SELECT id, sync_type, external_account_id, status, started_at,
             records_synced, error_message
      FROM platform_sync_log
      WHERE platform = 'YOUTUBE'
      ORDER BY started_at DESC
      LIMIT 100
      `,
      [],
    ),
    query<ActivityLogQueryRow>(
      `
      SELECT id, external_account_id, event_type, status, payload_summary, received_at
      FROM platform_activity_log
      WHERE platform = 'YOUTUBE'
      ORDER BY received_at DESC
      LIMIT 200
      `,
      [],
    ),
  ]);

  if (enabledChannels.length === 0 && byExternalId.size > 0) {
    enabledChannels = [...byExternalId.values()].map((integration) => ({
      key: integration.channel_key ?? integration.external_account_id ?? "default",
      name: integration.account_name ?? "YouTube Channel",
      displayName: integration.account_name ?? "YouTube Channel",
      brandSlug: integration.channel_key ?? "default",
      enabled: true,
      channelId: integration.external_account_id ?? "",
      channelIdEnvKey: "",
      enabledEnvKey: "",
    }));
  }

  if (enabledChannels.length === 0) {
    return [];
  }

  const results: YouTubeChannelDashboard[] = [];

  for (const config of enabledChannels) {
    const integration = resolveIntegrationForConfig(
      config,
      byChannelKey,
      byExternalId,
    );

    if (!integration || !integration.token_reference) {
      results.push(buildUnconnectedChannelDashboard(config, syncRes.rows));
      continue;
    }

    results.push(
      await loadConnectedChannelDashboard(
        config,
        integration,
        syncRes.rows,
        logsRes.rows,
        input?.dateRange,
      ),
    );
  }

  return results;
}

export async function getYouTubeChannelAnalyticsByKey(
  channelKey: string,
  dateRange?: AnalyticsDateRange,
): Promise<YouTubeChannelDashboard | null> {
  const config = getYouTubeChannelByKey(channelKey);
  if (!config || !config.enabled) {
    return null;
  }

  const channels = await getYouTubeChannelsAnalytics({ dateRange });
  return channels.find((channel) => channel.key === channelKey) ?? null;
}

export function getYouTubeExternalAccountIdForChannelKey(
  channelKey: string,
  integrations: Map<string, PlatformIntegrationRow>,
): string | null {
  const integration = integrations.get(channelKey);
  return integration?.external_account_id ?? null;
}

export type { PlatformIntegrationRow };
