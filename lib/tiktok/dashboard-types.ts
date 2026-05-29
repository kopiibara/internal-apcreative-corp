import type {
  ContentPerformanceRow,
  KpiMetric,
  StatusRow,
  SyncLogRow,
} from "@/lib/platform-analytics/types";

export type TikTokBrandDashboard = {
  brandId: number;
  brandName: string;
  brandSlug: string;
  integrationId: number | null;
  openId: string | null;
  accountName: string | null;
  connectionStatus:
    | "Connected"
    | "Not connected"
    | "Reconnect required"
    | "Error";
  status: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  missingScopes: string[];
  apiConfigured: boolean;
  statusRows: StatusRow[];
  overviewKpis: KpiMetric[];
  engagementKpis: KpiMetric[];
  contentPerformance: ContentPerformanceRow[];
  syncHistory: SyncLogRow[];
};
