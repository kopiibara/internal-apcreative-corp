export type AnalyticsPlatform = "META" | "TIKTOK" | "YOUTUBE" | "GOOGLE";

export type PlatformCode = "META" | "TIKTOK" | "YOUTUBE" | "GOOGLE";

export type MetaScope = "combined" | "facebook" | "instagram";

export type AnalyticsDateRange =
  | "today"
  | "7d"
  | "28d"
  | "month"
  | "90d"
  | "365d"
  | "custom";

export type DataSourceType = "LIVE" | "API" | "WEBHOOK" | "DEMO";

export type PlatformAccount = {
  id: string;
  platform: PlatformCode;
  accountType: string;
  accountName: string;
  externalAccountId: string;
  isDemo: boolean;
  lastSyncedAt: string | null;
};

export type StatusRow = {
  label: string;
  ok: boolean;
  detail?: string;
};

export type KpiMetric = {
  label: string;
  value: string | number;
  hint?: string;
  isDemo?: boolean;
  metaScope?: MetaScope;
};

export type ChartPoint = {
  label: string;
  [key: string]: string | number;
};

export type PlatformChartConfig = {
  id: string;
  title: string;
  description?: string;
  data: ChartPoint[];
  keys: Array<{ key: string; label: string; color: string }>;
  chartType: "line" | "bar" | "area";
  valueFormat?: "whole" | "decimal";
};

export type GrowthSnapshotRow = {
  id: string | number;
  date: string;
  followers: number | null;
  secondaryLabel: string;
  secondaryValue: number | null;
};

export type ContentPerformanceRow = {
  id: string | number;
  rank: number | null;
  title: string;
  publishedAt: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  engagementRate: string | null;
  impressions: number | null;
  engaged: number | null;
  clicks: number | null;
  watchTime: string | null;
  avgViewDuration: string | null;
  profileVisits: number | null;
  source: string;
  link: string | null;
  isDemo: boolean;
};

export type CampaignPerformanceRow = {
  id: string | number;
  campaignName: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: string;
  cpc: string;
  spend: string;
  conversions: number;
  costPerConversion: string;
  source: string;
  isDemo: boolean;
};

export type ActivityLogRow = {
  id: string | number;
  platform: PlatformCode;
  eventType: string;
  status: string;
  receivedAt: string;
  summary: string;
  isDemo: boolean;
};

export type SyncLogRow = {
  id: string | number;
  platform: PlatformCode;
  syncType: string;
  accountId: string | null;
  status: string;
  startedAt: string;
  recordsSynced: number;
  errorMessage: string | null;
  isDemo: boolean;
};

export type PlatformConnectionStatus = {
  platform: PlatformCode;
  isDemo: boolean;
  apiConnected: boolean;
  webhookSupported: boolean;
  webhookConfigured: boolean;
  cronConfigured: boolean;
  connectedAccountsCount: number;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  tokenStatus: "OK" | "Missing" | "Demo";
  syncHealth: "OK" | "Needs sync" | "Failed" | "Demo";
  statusRows: StatusRow[];
};

export type MetaSourceSyncStatus =
  import("@/lib/meta/page-analytics").MetaSourceSyncStatus;

export type MetaBusinessPageDashboard =
  import("@/lib/meta/page-analytics").MetaBusinessPageDashboard;

export type TikTokBrandDashboard =
  import("@/lib/tiktok/dashboard-types").TikTokBrandDashboard;

export type PlatformAnalyticsDashboardData = {
  platform: AnalyticsPlatform;
  accountId: string | null;
  isDemo: boolean;
  accounts: PlatformAccount[];
  connection: PlatformConnectionStatus;
  overviewKpis: KpiMetric[];
  engagementKpis: KpiMetric[];
  audienceInsightKpis: KpiMetric[];
  growthSnapshots: GrowthSnapshotRow[];
  contentPerformance: ContentPerformanceRow[];
  campaignPerformance: CampaignPerformanceRow[];
  activityLogs: ActivityLogRow[];
  syncHistory: SyncLogRow[];
  charts: PlatformChartConfig[];
  metaNeedsBootstrap: boolean;
  metaBusinessPages: MetaBusinessPageDashboard[];
  tiktokBrandAnalytics: TikTokBrandDashboard[];
};
