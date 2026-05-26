import "server-only";

import { query } from "@/lib/db";
import {
  getYouTubeLatestMetricMap,
  getYouTubeLiveMetricMap,
} from "@/lib/platform-analytics/youtube-sync";
import { liveMetric } from "@/lib/platform-analytics/format";
import type { PlatformChartConfig } from "@/lib/platform-analytics/types";
import type { AnalyticsDateRange } from "@/lib/platform-analytics/types";
import type {
  ActivityLogRow,
  ContentPerformanceRow,
  GrowthSnapshotRow,
  KpiMetric,
  PlatformAccount,
  PlatformConnectionStatus,
  SyncLogRow,
} from "@/lib/platform-analytics/types";

type YouTubeTrendRow = {
  metric_date: string;
  metric_key: string;
  metric_value: number;
};

type YouTubeContentRow = {
  title: string;
  views: number | null;
  likes: number;
  comments: number;
  shares: number;
  watchTime: string | null;
  avgViewDuration: string | null;
  publishedAt: string | null;
};

type PlatformIntegrationRow = {
  id: number;
  external_account_id: string | null;
  account_name: string | null;
  last_synced_at: string | null;
};

type GrowthSnapshotQueryRow = {
  metric_date: string;
  metric_value: number | string;
};

type ContentPerformanceQueryRow = {
  external_content_id: string;
  title: string | null;
  published_at: string | null;
  views_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  insights: {
    watch_minutes?: number | null;
    average_view_duration_seconds?: number | null;
  } | null;
  thumbnail_url: string | null;
};

type ActivityLogQueryRow = {
  id: number;
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

function dateRangeLabel(dateRange?: AnalyticsDateRange) {
  switch (dateRange) {
    case "7d":
      return "Last 7 days";
    case "90d":
      return "Last 90 days";
    case "365d":
      return "Last 365 days";
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
    case "7d":
      return 7;
    case "90d":
      return 90;
    case "365d":
      return 365;
    case "28d":
    default:
      return 28;
  }
}

function dateRangeToStartOffset(dateRange?: AnalyticsDateRange) {
  return Math.max(dateRangeToDays(dateRange) - 1, 0);
}

function buildYouTubeCharts(
  trendRows: YouTubeTrendRow[],
  topVideos: YouTubeContentRow[],
  subscriberSnapshots: GrowthSnapshotRow[],
  dateRange?: AnalyticsDateRange,
): PlatformChartConfig[] {
  const periodLabel = dateRangeLabel(dateRange);
  const periodLabelShort = dateRangeLabelShort(dateRange);
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
      entry.views = row.metric_value;
    }

    if (row.metric_key === "watch_time_minutes") {
      entry.watchTimeMinutes = row.metric_value;
    }

    if (row.metric_key === "subscribers_total") {
      entry.subscribersTotal = row.metric_value;
    }

    if (row.metric_key === "subscribers_net") {
      entry.subscribersNet = row.metric_value;
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
      description: `${periodLabel} from YouTube Analytics`,
      data: trend,
      keys: [{ key: "views", label: "Views", color: "var(--chart-1)" }],
      chartType: "line",
    },
    {
      id: "yt-subscribers-trend",
      title: "Subscribers growth",
      description: `Daily subscriber total snapshots (${periodLabelShort})`,
      data: subscriberTrend,
      keys: [
        { key: "subscribers", label: "Subscribers", color: "var(--chart-2)" },
      ],
      chartType: "area",
    },
    {
      id: "yt-watch-time-trend",
      title: "Watch time trend",
      description: `Daily minutes watched (${periodLabelShort})`,
      data: trend,
      keys: [
        {
          key: "watchTimeMinutes",
          label: "Watch time (minutes)",
          color: "var(--chart-3)",
        },
      ],
      chartType: "bar",
    },
    {
      id: "yt-subscriber-change",
      title: "Subscriber change",
      description: `Gained minus lost over ${periodLabelShort}`,
      data: trend,
      keys: [
        {
          key: "subscribersNet",
          label: "Net subscribers",
          color: "var(--chart-4)",
        },
      ],
      chartType: "line",
    },
    {
      id: "yt-top-videos",
      title: "Top videos by views",
      description: `Live video performance from synced content rows (${periodLabelShort})`,
      data: topVideoData,
      keys: [{ key: "views", label: "Views", color: "var(--chart-5)" }],
      chartType: "bar",
    },
  ];
}
export async function loadYouTubePlatformSlice(
  accountId: string | null,
  dateRange?: AnalyticsDateRange,
) {
  const accountsRes = await query<PlatformIntegrationRow>(
    `
    SELECT id, external_account_id, account_name, last_synced_at
    FROM platform_integration
    WHERE platform = 'YOUTUBE'
      AND status IN ('ACTIVE','ERROR')
    ORDER BY updated_at DESC
    `,
    [],
  );

  const accounts: PlatformAccount[] = (
    accountsRes.rows as PlatformIntegrationRow[]
  ).map((r) => ({
    id: String(r.external_account_id ?? r.id),
    platform: "YOUTUBE",
    accountType: "youtube_channel",
    accountName: r.account_name || "YouTube Channel",
    externalAccountId: r.external_account_id ?? String(r.id),
    isDemo: false,
    lastSyncedAt: r.last_synced_at
      ? new Date(r.last_synced_at).toISOString()
      : null,
  }));

  const selectedAccount =
    !accountId || accountId === "all"
      ? accounts[0]
      : accounts.find((a) => a.externalAccountId === accountId) || null;

  const connection: PlatformConnectionStatus = {
    platform: "YOUTUBE",
    isDemo: false,
    apiConnected: accounts.length > 0,
    webhookSupported: true,
    webhookConfigured: false,
    cronConfigured: true,
    connectedAccountsCount: accounts.length,
    lastSyncAt: accounts[0]?.lastSyncedAt ?? null,
    lastSyncError: null,
    tokenStatus: accounts.length ? "OK" : "Missing",
    syncHealth: accounts.length ? "OK" : "Needs sync",
    statusRows: [
      { label: "YouTube webhook status", ok: false, detail: "Pending" },
      {
        label: "Channel connection",
        ok: accounts.length > 0,
        detail: accounts.length
          ? String(accounts[0].accountName)
          : "Not connected",
      },
      {
        label: "Google OAuth status",
        ok: accounts.length > 0,
        detail: accounts.length ? "Authorized" : "Missing",
      },
      {
        label: "Last sync",
        ok: Boolean(accounts[0]?.lastSyncedAt),
        detail: accounts[0]?.lastSyncedAt ?? "Never",
      },
      {
        label: "Connected channels",
        ok: accounts.length > 0,
        detail: String(accounts.length),
      },
    ],
  };

  // Load latest metric map for selected account
  let metricMap = new Map<string, number>();
  if (selectedAccount && selectedAccount.externalAccountId) {
    try {
      const liveMetricMap = await getYouTubeLiveMetricMap(
        selectedAccount.externalAccountId,
        dateRange,
      );
      metricMap =
        liveMetricMap ??
        (await getYouTubeLatestMetricMap(selectedAccount.externalAccountId));
    } catch {
      try {
        metricMap = await getYouTubeLatestMetricMap(
          selectedAccount.externalAccountId,
        );
      } catch {
        // ignore and fall back to empty map
      }
    }
  }

  const overviewKpis: KpiMetric[] = [
    {
      label: "Subscribers",
      value: liveMetric(metricMap.get("subscribers_total")),
      hint: "Current channel total",
    },
    {
      label: "Subscribers change",
      value: liveMetric(metricMap.get("subscribers_net")),
      hint: `${dateRangeLabel(dateRange)} (gained - lost)`,
    },
    {
      label: "Views",
      value: liveMetric(metricMap.get("views")),
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Watch time",
      value: (() => {
        const watchTimeMinutes = metricMap.get("watch_time_minutes");
        return watchTimeMinutes !== undefined
          ? `${watchTimeMinutes.toLocaleString("en-PH")} minutes`
          : "No live data yet";
      })(),
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Average view duration",
      value: metricMap.get("avg_view_duration_seconds")
        ? `${Math.round((metricMap.get("avg_view_duration_seconds") ?? 0) / 60)}m ${Math.round((metricMap.get("avg_view_duration_seconds") ?? 0) % 60)}s`
        : "No live data yet",
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Likes",
      value: liveMetric(metricMap.get("likes")),
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Comments",
      value: liveMetric(metricMap.get("comments")),
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Shares",
      value: liveMetric(metricMap.get("shares")),
      hint: dateRangeLabel(dateRange),
    },
  ];

  const engagementKpis: KpiMetric[] = [
    { label: "Likes", value: liveMetric(metricMap.get("likes")) },
    { label: "Comments", value: liveMetric(metricMap.get("comments")) },
    { label: "Shares", value: liveMetric(metricMap.get("shares")) },
    {
      label: "Average view duration",
      value: metricMap.get("avg_view_duration_seconds")
        ? `${Math.round((metricMap.get("avg_view_duration_seconds") ?? 0) / 60)}m`
        : "No live data yet",
    },
  ];

  const audienceInsightKpis: KpiMetric[] = [
    {
      label: "Subscribers",
      value: liveMetric(metricMap.get("subscribers_total")),
      hint: "Current channel total",
    },
    {
      label: "Subscribers change (28d)",
      value: liveMetric(metricMap.get("subscribers_net")),
      hint: `${dateRangeLabel(dateRange)} - gained minus lost`,
    },
    {
      label: "Watch time",
      value: (() => {
        const watchTimeMinutes = metricMap.get("watch_time_minutes");
        return watchTimeMinutes !== undefined
          ? `${watchTimeMinutes.toLocaleString("en-PH")} minutes`
          : "No live data yet";
      })(),
      hint: dateRangeLabel(dateRange),
    },
  ];

  // Growth snapshots from metric snapshots
  const startOffset = dateRangeToStartOffset(dateRange);
  const growthRes = await query<GrowthSnapshotQueryRow>(
    `
    SELECT metric_date, metric_value::numeric
    FROM platform_metric_snapshot
    WHERE platform = 'YOUTUBE'
      AND metric_key = 'subscribers_total'
      AND ($1::text IS NULL OR external_account_id = $1)
      AND metric_date >= (CURRENT_DATE - $2::int)
    ORDER BY metric_date DESC
    LIMIT 30
    `,
    [selectedAccount?.externalAccountId ?? null, startOffset],
  );

  const growthSnapshots: GrowthSnapshotRow[] = (
    growthRes.rows as GrowthSnapshotQueryRow[]
  )
    .map((r, idx: number) => ({
      id: `yt-${idx}-${r.metric_date}`,
      date: String(r.metric_date),
      followers: Number(r.metric_value),
      secondaryLabel: "Views",
      secondaryValue: null,
    }))
    .reverse();

  // Content performance
  const contentRes = await query<ContentPerformanceQueryRow>(
    `
    SELECT external_content_id, title, published_at, views_count, likes_count, comments_count, shares_count, insights, thumbnail_url
    FROM platform_content_performance
    WHERE platform = 'YOUTUBE'
      AND ($1::text IS NULL OR external_account_id = $1)
    ORDER BY views_count DESC
    LIMIT 50
    `,
    [selectedAccount?.externalAccountId ?? null],
  );

  const contentPerformance: ContentPerformanceRow[] = (
    contentRes.rows as ContentPerformanceQueryRow[]
  ).map((r) => ({
    id: r.external_content_id,
    rank: null,
    title: r.title || "Untitled video",
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    views: r.views_count ?? null,
    likes: r.likes_count ?? 0,
    comments: r.comments_count ?? 0,
    shares: r.shares_count ?? 0,
    engagementRate: null,
    impressions: null,
    engaged: null,
    clicks: null,
    watchTime: r.insights?.watch_minutes
      ? `${r.insights.watch_minutes} minutes`
      : null,
    avgViewDuration: r.insights?.average_view_duration_seconds
      ? `${Math.round((r.insights.average_view_duration_seconds ?? 0) / 60)}m ${Math.round((r.insights.average_view_duration_seconds ?? 0) % 60)}s`
      : null,
    profileVisits: null,
    source: "Synced",
    link: null,
    isDemo: false,
  }));

  const trendRes = await query<YouTubeTrendRow>(
    `
    SELECT metric_date, metric_key, metric_value::numeric
    FROM platform_metric_snapshot
    WHERE platform = 'YOUTUBE'
      AND ($1::text IS NULL OR external_account_id = $1)
      AND metric_key IN ('views', 'watch_time_minutes', 'subscribers_total', 'subscribers_net')
      AND metric_date >= (CURRENT_DATE - $2::int)
    ORDER BY metric_date ASC
    `,
    [selectedAccount?.externalAccountId ?? null, startOffset],
  );

  const viewsByDate = new Map<string, number>();
  for (const row of trendRes.rows) {
    if (row.metric_key === "views") {
      viewsByDate.set(row.metric_date, row.metric_value);
    }
  }

  const growthSnapshotsLive = growthSnapshots.map((row) => ({
    ...row,
    secondaryValue: viewsByDate.get(row.date) ?? null,
  }));

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

  // Activity logs
  const logsRes = await query<ActivityLogQueryRow>(
    `
    SELECT id, event_type, status, payload_summary, received_at
    FROM platform_activity_log
    WHERE platform = 'YOUTUBE'
    ORDER BY received_at DESC
    LIMIT 50
    `,
    [],
  );

  const activityLogs: ActivityLogRow[] = (
    logsRes.rows as ActivityLogQueryRow[]
  ).map((r) => ({
    id: r.id,
    platform: "YOUTUBE",
    eventType: r.event_type || "event",
    status: r.status || "",
    receivedAt: new Date(r.received_at).toISOString(),
    summary: r.payload_summary || "",
    isDemo: false,
  }));

  const syncRes = await query<SyncLogQueryRow>(
    `
    SELECT id, sync_type, external_account_id, status, started_at, records_synced, error_message
    FROM platform_sync_log
    WHERE platform = 'YOUTUBE'
    ORDER BY started_at DESC
    LIMIT 20
    `,
    [],
  );

  const syncHistory: SyncLogRow[] = (syncRes.rows as SyncLogQueryRow[]).map(
    (r) => ({
      id: r.id,
      platform: "YOUTUBE",
      syncType: r.sync_type,
      accountId: r.external_account_id,
      status: r.status,
      startedAt: new Date(r.started_at).toISOString(),
      recordsSynced: r.records_synced ?? 0,
      errorMessage: r.error_message ?? null,
      isDemo: false,
    }),
  );

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
    charts: buildYouTubeCharts(
      trendRes.rows,
      topVideoRows,
      growthSnapshotsLive,
      dateRange,
    ),
    metaNeedsBootstrap: false,
    isDemo: false,
  };
}

export function youtubeAccountIdFromFilter(accountId: string | null) {
  if (!accountId || accountId === "all") return null;
  return accountId;
}
