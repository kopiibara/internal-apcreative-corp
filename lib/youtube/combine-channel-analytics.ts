import "server-only";

import type {
  ActivityLogRow,
  ContentPerformanceRow,
  GrowthSnapshotRow,
  KpiMetric,
  PlatformAccount,
  PlatformChartConfig,
  PlatformConnectionStatus,
  SyncLogRow,
} from "@/lib/platform-analytics/types";
import type { AnalyticsDateRange } from "@/lib/platform-analytics/types";
import { formatWholeMetric } from "@/lib/platform-analytics/format";
import type { YouTubeChannelDashboard } from "@/lib/youtube/channel-analytics-types";
import { buildYouTubeCharts } from "@/lib/youtube/channel-analytics";

type TrendAccumulator = {
  label: string;
  views: number;
  watchTimeMinutes: number;
  subscribersTotal: number;
  subscribersNet: number;
};

function parseMetricValue(kpi: KpiMetric): number {
  if (typeof kpi.value === "number") {
    return kpi.value;
  }
  const cleaned = String(kpi.value).replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseWatchTimeMinutes(kpi: KpiMetric): number {
  if (typeof kpi.value === "number") {
    return kpi.value;
  }
  const match = String(kpi.value).match(/^([\d,]+)/);
  if (!match) {
    return 0;
  }
  return Number(match[1].replace(/,/g, "")) || 0;
}

function parseAvgDurationSeconds(kpi: KpiMetric): number {
  const text = String(kpi.value);
  const match = text.match(/(\d+)m\s*(\d+)s/);
  if (!match) {
    return 0;
  }
  return Number(match[1]) * 60 + Number(match[2]);
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

function metricFromKpis(kpis: KpiMetric[], label: string) {
  return kpis.find((kpi) => kpi.label === label);
}

export function combineYouTubeChannelDashboards(
  channels: YouTubeChannelDashboard[],
  dateRange?: AnalyticsDateRange,
): Pick<
  YouTubeChannelDashboard,
  | "overviewKpis"
  | "engagementKpis"
  | "audienceInsightKpis"
  | "growthSnapshots"
  | "contentPerformance"
  | "charts"
  | "activityLogs"
  | "syncHistory"
  | "connection"
  | "statusMessage"
> {
  const connected = channels.filter(
    (channel) => channel.connectionStatus === "Connected",
  );

  if (connected.length === 0) {
    return {
      overviewKpis: [],
      engagementKpis: [],
      audienceInsightKpis: [],
      growthSnapshots: [],
      contentPerformance: [],
      charts: [],
      activityLogs: [],
      syncHistory: [],
      statusMessage: "No connected YouTube channels available.",
      connection: {
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
          { label: "Channel connection", ok: false, detail: "Not connected" },
          {
            label: "Google OAuth status",
            ok: false,
            detail: "Not authorized",
          },
          { label: "Last sync", ok: false, detail: "Never" },
          { label: "Connected channels", ok: false, detail: "0" },
        ],
      },
    };
  }

  let subscribersTotal = 0;
  let subscribersNet = 0;
  let views = 0;
  let watchTimeMinutes = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  let weightedDurationSeconds = 0;

  for (const channel of connected) {
    const subs = metricFromKpis(channel.overviewKpis, "Subscribers");
    const subsChange = metricFromKpis(channel.overviewKpis, "Subscribers change");
    const viewsKpi = metricFromKpis(channel.overviewKpis, "Views");
    const watchKpi = metricFromKpis(channel.overviewKpis, "Watch time");
    const avgKpi = metricFromKpis(channel.overviewKpis, "Average view duration");
    const likesKpi = metricFromKpis(channel.overviewKpis, "Likes");
    const commentsKpi = metricFromKpis(channel.overviewKpis, "Comments");
    const sharesKpi = metricFromKpis(channel.overviewKpis, "Shares");

    const channelViews = viewsKpi ? parseMetricValue(viewsKpi) : 0;
    const channelWatchMinutes = watchKpi ? parseWatchTimeMinutes(watchKpi) : 0;
    const channelAvgSeconds = avgKpi ? parseAvgDurationSeconds(avgKpi) : 0;

    subscribersTotal += subs ? parseMetricValue(subs) : 0;
    subscribersNet += subsChange ? parseMetricValue(subsChange) : 0;
    views += channelViews;
    watchTimeMinutes += channelWatchMinutes;
    likes += likesKpi ? parseMetricValue(likesKpi) : 0;
    comments += commentsKpi ? parseMetricValue(commentsKpi) : 0;
    shares += sharesKpi ? parseMetricValue(sharesKpi) : 0;

    if (channelViews > 0 && channelAvgSeconds > 0) {
      weightedDurationSeconds += channelAvgSeconds * channelViews;
    } else if (channelWatchMinutes > 0 && channelViews > 0) {
      weightedDurationSeconds += (channelWatchMinutes * 60 * channelViews) / channelViews;
    }
  }

  const avgViewDurationSeconds =
    views > 0 ? weightedDurationSeconds / views : 0;
  const engagementTotal = likes + comments + shares;

  const overviewKpis: KpiMetric[] = [
    {
      label: "Subscribers",
      value: formatWholeMetric(subscribersTotal),
      hint: "Combined total across connected channels",
    },
    {
      label: "Subscribers change",
      value: formatWholeMetric(subscribersNet),
      hint: `${dateRangeLabel(dateRange)} (gained - lost)`,
    },
    {
      label: "Views",
      value: formatWholeMetric(views),
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Watch time",
      value: `${formatWholeMetric(watchTimeMinutes)} minutes`,
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Average view duration",
      value: avgViewDurationSeconds
        ? `${Math.round(avgViewDurationSeconds / 60)}m ${Math.round(avgViewDurationSeconds % 60)}s`
        : "No live data yet",
      hint: "Weighted average across connected channels",
    },
    {
      label: "Likes",
      value: formatWholeMetric(likes),
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Comments",
      value: formatWholeMetric(comments),
      hint: dateRangeLabel(dateRange),
    },
    {
      label: "Shares",
      value: formatWholeMetric(shares),
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

  const engagementKpis: KpiMetric[] = [
    { label: "Likes", value: formatWholeMetric(likes) },
    { label: "Comments", value: formatWholeMetric(comments) },
    { label: "Shares", value: formatWholeMetric(shares) },
    {
      label: "Average view duration",
      value: avgViewDurationSeconds
        ? `${Math.round(avgViewDurationSeconds / 60)}m`
        : "No live data yet",
    },
  ];

  const audienceInsightKpis: KpiMetric[] = [
    {
      label: "Subscribers",
      value: formatWholeMetric(subscribersTotal),
      hint: "Combined total across connected channels",
    },
    {
      label: "Subscribers change (28d)",
      value: formatWholeMetric(subscribersNet),
      hint: `${dateRangeLabel(dateRange)} - gained minus lost`,
    },
    {
      label: "Watch time",
      value: `${formatWholeMetric(watchTimeMinutes)} minutes`,
      hint: dateRangeLabel(dateRange),
    },
  ];

  const contentPerformance: ContentPerformanceRow[] = connected
    .flatMap((channel) => channel.contentPerformance)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 50);

  const growthByDate = new Map<string, { followers: number; views: number }>();
  for (const channel of connected) {
    for (const row of channel.growthSnapshots) {
      const existing = growthByDate.get(row.date) ?? {
        followers: 0,
        views: 0,
      };
      existing.followers += row.followers ?? 0;
      existing.views += row.secondaryValue ?? 0;
      growthByDate.set(row.date, existing);
    }
  }

  const growthSnapshots: GrowthSnapshotRow[] = [...growthByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values], idx) => ({
      id: `yt-combined-${idx}-${date}`,
      date,
      followers: values.followers,
      secondaryLabel: "Views",
      secondaryValue: values.views,
    }));

  const trendMap = new Map<string, TrendAccumulator>();
  for (const channel of connected) {
    for (const chart of channel.charts) {
      if (chart.id !== "yt-views-trend") {
        continue;
      }
      for (const point of chart.data) {
        const dateKey = point.label;
        const entry = trendMap.get(dateKey) ?? {
          label: dateKey,
          views: 0,
          watchTimeMinutes: 0,
          subscribersTotal: 0,
          subscribersNet: 0,
        };
        entry.views += Number(point.views ?? 0);
        trendMap.set(dateKey, entry);
      }
    }
    for (const chart of channel.charts) {
      if (chart.id !== "yt-watch-time-trend") {
        continue;
      }
      for (const point of chart.data) {
        const dateKey = point.label;
        const entry = trendMap.get(dateKey) ?? {
          label: dateKey,
          views: 0,
          watchTimeMinutes: 0,
          subscribersTotal: 0,
          subscribersNet: 0,
        };
        entry.watchTimeMinutes += Number(point.watchTimeMinutes ?? 0);
        trendMap.set(dateKey, entry);
      }
    }
    for (const chart of channel.charts) {
      if (chart.id !== "yt-subscriber-change") {
        continue;
      }
      for (const point of chart.data) {
        const dateKey = point.label;
        const entry = trendMap.get(dateKey) ?? {
          label: dateKey,
          views: 0,
          watchTimeMinutes: 0,
          subscribersTotal: 0,
          subscribersNet: 0,
        };
        entry.subscribersNet += Number(point.subscribersNet ?? 0);
        trendMap.set(dateKey, entry);
      }
    }
    for (const chart of channel.charts) {
      if (chart.id !== "yt-subscribers-trend") {
        continue;
      }
      for (const point of chart.data) {
        const dateKey = point.label;
        const entry = trendMap.get(dateKey) ?? {
          label: dateKey,
          views: 0,
          watchTimeMinutes: 0,
          subscribersTotal: 0,
          subscribersNet: 0,
        };
        entry.subscribersTotal += Number(point.subscribers ?? 0);
        trendMap.set(dateKey, entry);
      }
    }
  }

  const trendRows = [...trendMap.values()].flatMap((entry) => [
    {
      metric_date: entry.label,
      metric_key: "views",
      metric_value: entry.views,
    },
    {
      metric_date: entry.label,
      metric_key: "watch_time_minutes",
      metric_value: entry.watchTimeMinutes,
    },
    {
      metric_date: entry.label,
      metric_key: "subscribers_total",
      metric_value: entry.subscribersTotal,
    },
    {
      metric_date: entry.label,
      metric_key: "subscribers_net",
      metric_value: entry.subscribersNet,
    },
  ]);

  const topVideoRows = contentPerformance.map((row) => ({
    title: row.title,
    views: row.views,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    watchTime: row.watchTime,
    avgViewDuration: row.avgViewDuration,
    publishedAt: row.publishedAt,
  }));

  const charts: PlatformChartConfig[] = buildYouTubeCharts(
    trendRows,
    topVideoRows,
    growthSnapshots,
    dateRange,
    "All YouTube Channels",
  );

  const activityLogs: ActivityLogRow[] = connected
    .flatMap((channel) => channel.activityLogs)
    .sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    )
    .slice(0, 50);

  const syncHistory: SyncLogRow[] = connected
    .flatMap((channel) => channel.syncHistory)
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )
    .slice(0, 20);

  const lastSyncAt =
    connected
      .map((channel) => channel.lastSyncAt)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

  const failedChannels = channels.filter(
    (channel) =>
      channel.connectionStatus === "Connected" &&
      (channel.videoSyncStatus === "failed" ||
        channel.analyticsSyncStatus === "failed"),
  );

  const connection: PlatformConnectionStatus = {
    platform: "YOUTUBE",
    isDemo: false,
    apiConnected: connected.length > 0,
    webhookSupported: true,
    webhookConfigured: false,
    cronConfigured: true,
    connectedAccountsCount: connected.length,
    lastSyncAt,
    lastSyncError:
      failedChannels.length > 0
        ? `${failedChannels.length} channel(s) have sync failures.`
        : null,
    tokenStatus: connected.length > 0 ? "OK" : "Missing",
    syncHealth: failedChannels.length > 0 ? "Failed" : lastSyncAt ? "OK" : "Needs sync",
    statusRows: [
      { label: "YouTube webhook status", ok: false, detail: "Pending" },
      {
        label: "Channel connection",
        ok: connected.length > 0,
        detail:
          connected.length > 0
            ? `${connected.length} connected`
            : "Not connected",
      },
      {
        label: "Google OAuth status",
        ok: connected.length > 0,
        detail: connected.length > 0 ? "Authorized" : "Not authorized",
      },
      {
        label: "Last sync",
        ok: Boolean(lastSyncAt),
        detail: lastSyncAt ?? "Never",
      },
      {
        label: "Connected channels",
        ok: connected.length > 0,
        detail: String(connected.length),
      },
    ],
  };

  return {
    overviewKpis,
    engagementKpis,
    audienceInsightKpis,
    growthSnapshots,
    contentPerformance,
    charts,
    activityLogs,
    syncHistory,
    connection,
    statusMessage: null,
  };
}

export function buildYouTubeAccountsFromChannels(
  channels: YouTubeChannelDashboard[],
): PlatformAccount[] {
  return channels.map((channel) => ({
    id: channel.key,
    platform: "YOUTUBE" as const,
    accountType: "youtube_channel",
    accountName: channel.displayName,
    externalAccountId: channel.channelId ?? channel.key,
    isDemo: false,
    lastSyncedAt: channel.lastSyncAt,
  }));
}
