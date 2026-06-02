import type {
  ActivityLogRow,
  ContentPerformanceRow,
  GrowthSnapshotRow,
  KpiMetric,
  PlatformChartConfig,
  PlatformConnectionStatus,
  SyncLogRow,
} from "@/lib/platform-analytics/types";

export type YouTubeChannelConfigKey = string;

export type YouTubeSourceSyncStatus =
  | "success"
  | "failed"
  | "pending"
  | "never"
  | "missing_token"
  | "no_data";

export type YouTubeChannelDashboard = {
  key: YouTubeChannelConfigKey;
  displayName: string;
  channelId: string | null;
  connectionStatus: "Connected" | "Not connected" | "Needs configuration";
  oauthStatus: "Authorized" | "Not authorized";
  lastSyncAt: string | null;
  videoSyncStatus: YouTubeSourceSyncStatus;
  analyticsSyncStatus: YouTubeSourceSyncStatus;
  statusMessage: string | null;
  overviewKpis: KpiMetric[];
  engagementKpis: KpiMetric[];
  audienceInsightKpis: KpiMetric[];
  growthSnapshots: GrowthSnapshotRow[];
  contentPerformance: ContentPerformanceRow[];
  charts: PlatformChartConfig[];
  activityLogs: ActivityLogRow[];
  syncHistory: SyncLogRow[];
  connection: PlatformConnectionStatus;
};
