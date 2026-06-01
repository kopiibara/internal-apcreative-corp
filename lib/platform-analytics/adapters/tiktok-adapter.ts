import "server-only";

import { query } from "@/lib/db";
import { findMissingTikTokScopes } from "@/lib/tiktok/client";
import { isTikTokOAuthConfigured } from "@/lib/tiktok/config";
import type { TikTokBrandDashboard } from "@/lib/tiktok/dashboard-types";
import { getTikTokIntegrationByBrandId } from "@/lib/tiktok/integration-db";
import {
  getPlatformAnalyticsBrandScope,
} from "@/lib/platform-analytics/brand-scope";
import { liveMetric } from "@/lib/platform-analytics/format";
import type {
  ActivityLogRow,
  ContentPerformanceRow,
  GrowthSnapshotRow,
  KpiMetric,
  PlatformAccount,
  PlatformChartConfig,
  PlatformConnectionStatus,
  StatusRow,
  SyncLogRow,
} from "@/lib/platform-analytics/types";

type BrandRow = { id: number; name: string; slug: string };

type AccountSnapshotRow = {
  snapshot_date: string;
  follower_count: string | number | null;
  following_count: string | number | null;
  likes_count: string | number | null;
  video_count: string | number | null;
};

type VideoContentRow = {
  tiktok_video_id: string;
  title: string | null;
  embed_link: string | null;
  create_time: string | null;
  view_count: string | number | null;
  like_count: string | number | null;
  comment_count: string | number | null;
  share_count: string | number | null;
};

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatEngagementRate(
  views: number | null,
  likes: number | null,
  comments: number | null,
  shares: number | null,
): string | null {
  if (views == null || views <= 0) {
    return null;
  }
  const engaged =
    (likes ?? 0) + (comments ?? 0) + (shares ?? 0);
  if (likes == null && comments == null && shares == null) {
    return null;
  }
  return `${((engaged / views) * 100).toFixed(2)}%`;
}

function connectionStatusFromIntegration(
  status: string | null,
): TikTokBrandDashboard["connectionStatus"] {
  switch (status) {
    case "ACTIVE":
      return "Connected";
    case "RECONNECT_REQUIRED":
      return "Reconnect required";
    case "ERROR":
      return "Error";
    default:
      return "Not connected";
  }
}

async function loadBrandsForScope(profileId: number | null): Promise<BrandRow[]> {
  if (profileId == null) {
    const all = await query<BrandRow>(
      `
      SELECT id, name, slug
      FROM brand
      WHERE is_active = true
      ORDER BY name ASC
      `,
    );
    return all.rows;
  }

  const scope = await getPlatformAnalyticsBrandScope(profileId);

  if (scope.hasAllBrandsAccess) {
    const all = await query<BrandRow>(
      `
      SELECT id, name, slug
      FROM brand
      WHERE is_active = true
      ORDER BY name ASC
      `,
    );
    return all.rows;
  }

  if (scope.allowedBrandIds.length === 0) {
    return [];
  }

  const scoped = await query<BrandRow>(
    `
    SELECT id, name, slug
    FROM brand
    WHERE is_active = true
      AND id = ANY($1::int[])
    ORDER BY name ASC
    `,
    [scope.allowedBrandIds],
  );

  return scoped.rows;
}

async function loadLatestAccountSnapshot(integrationId: number) {
  const result = await query<AccountSnapshotRow>(
    `
    SELECT
      snapshot_date,
      follower_count,
      following_count,
      likes_count,
      video_count
    FROM tiktok_account_snapshots
    WHERE integration_id = $1
    ORDER BY snapshot_date DESC
    LIMIT 1
    `,
    [integrationId],
  );
  return result.rows[0] ?? null;
}

async function loadPreviousAccountSnapshot(
  integrationId: number,
  beforeDate: string,
) {
  const result = await query<{ follower_count: string | number | null }>(
    `
    SELECT follower_count
    FROM tiktok_account_snapshots
    WHERE integration_id = $1
      AND snapshot_date < $2::date
    ORDER BY snapshot_date DESC
    LIMIT 1
    `,
    [integrationId, beforeDate],
  );
  return result.rows[0] ?? null;
}

async function loadVideoContentRows(integrationId: number): Promise<VideoContentRow[]> {
  const result = await query<VideoContentRow>(
    `
    SELECT
      p.tiktok_video_id,
      p.title,
      p.embed_link,
      p.create_time,
      s.view_count,
      s.like_count,
      s.comment_count,
      s.share_count
    FROM tiktok_video_posts p
    LEFT JOIN LATERAL (
      SELECT view_count, like_count, comment_count, share_count
      FROM tiktok_video_snapshots vs
      WHERE vs.integration_id = p.integration_id
        AND vs.tiktok_video_id = p.tiktok_video_id
      ORDER BY vs.snapshot_date DESC
      LIMIT 1
    ) s ON true
    WHERE p.integration_id = $1
    ORDER BY p.create_time DESC NULLS LAST
    LIMIT 50
    `,
    [integrationId],
  );
  return result.rows;
}

async function loadAggregateVideoMetrics(integrationId: number) {
  const result = await query<{
    total_views: string | null;
    total_likes: string | null;
    total_comments: string | null;
    total_shares: string | null;
  }>(
    `
    SELECT
      SUM(s.view_count) AS total_views,
      SUM(s.like_count) AS total_likes,
      SUM(s.comment_count) AS total_comments,
      SUM(s.share_count) AS total_shares
    FROM (
      SELECT DISTINCT ON (tiktok_video_id)
        tiktok_video_id,
        view_count,
        like_count,
        comment_count,
        share_count
      FROM tiktok_video_snapshots
      WHERE integration_id = $1
      ORDER BY tiktok_video_id, snapshot_date DESC
    ) s
    `,
    [integrationId],
  );
  return result.rows[0];
}

async function loadTikTokSyncHistory(
  integrationId: number | null,
): Promise<SyncLogRow[]> {
  if (!integrationId) {
    return [];
  }

  const result = await query<{
    id: number;
    sync_type: string;
    status: string;
    started_at: string;
    records_synced: number | null;
    error_message: string | null;
  }>(
    `
    SELECT id, sync_type, status, started_at, records_synced, error_message
    FROM platform_sync_log
    WHERE platform = 'TIKTOK'
      AND external_account_id = $1
    ORDER BY started_at DESC
    LIMIT 20
    `,
    [String(integrationId)],
  );

  return result.rows.map((row) => ({
    id: row.id,
    platform: "TIKTOK",
    syncType: row.sync_type,
    accountId: String(integrationId),
    status: row.status,
    startedAt: new Date(row.started_at).toISOString(),
    recordsSynced: row.records_synced ?? 0,
    errorMessage: row.error_message,
    isDemo: false,
  }));
}

async function buildTikTokBrandDashboard(brand: BrandRow): Promise<TikTokBrandDashboard> {
  const integration = await getTikTokIntegrationByBrandId(brand.id);
  const apiConfigured = isTikTokOAuthConfigured();
  const missingScopes = integration
    ? findMissingTikTokScopes(integration.scopes)
    : [];

  const accountSnapshot =
    integration != null
      ? await loadLatestAccountSnapshot(integration.id)
      : null;

  const previousSnapshot =
    integration != null && accountSnapshot
      ? await loadPreviousAccountSnapshot(
          integration.id,
          accountSnapshot.snapshot_date,
        )
      : null;

  const videoRows =
    integration != null ? await loadVideoContentRows(integration.id) : [];

  const aggregate =
    integration != null
      ? await loadAggregateVideoMetrics(integration.id)
      : null;

  const followers = toNumber(accountSnapshot?.follower_count);
  const following = toNumber(accountSnapshot?.following_count);
  const totalLikes = toNumber(accountSnapshot?.likes_count);
  const totalVideos = toNumber(accountSnapshot?.video_count);
  const prevFollowers = toNumber(previousSnapshot?.follower_count);

  const newFollowers =
    followers != null && prevFollowers != null
      ? followers - prevFollowers
      : null;

  const totalViews = toNumber(aggregate?.total_views);
  const videoLikes = toNumber(aggregate?.total_likes);
  const videoComments = toNumber(aggregate?.total_comments);
  const videoShares = toNumber(aggregate?.total_shares);

  const engagementRate = formatEngagementRate(
    totalViews,
    videoLikes,
    videoComments,
    videoShares,
  );

  const contentPerformance: ContentPerformanceRow[] = videoRows.map(
    (row, index) => {
      const views = toNumber(row.view_count);
      const likes = toNumber(row.like_count);
      const comments = toNumber(row.comment_count);
      const shares = toNumber(row.share_count);

      return {
        id: row.tiktok_video_id,
        rank: index + 1,
        title: row.title ?? "Untitled video",
        publishedAt: row.create_time
          ? new Date(row.create_time).toISOString()
          : null,
        views,
        likes,
        comments,
        shares,
        engagementRate: formatEngagementRate(views, likes, comments, shares),
        impressions: null,
        engaged: null,
        clicks: null,
        watchTime: null,
        avgViewDuration: null,
        profileVisits: null,
        source: "TikTok API",
        link: row.embed_link,
        isDemo: false,
      };
    },
  );

  const overviewKpis: KpiMetric[] = [
    { label: "Total followers", value: liveMetric(followers) },
    { label: "Following", value: liveMetric(following) },
    { label: "Total likes", value: liveMetric(totalLikes) },
    { label: "Total videos", value: liveMetric(totalVideos) },
    { label: "New followers", value: liveMetric(newFollowers) },
    { label: "Total video views", value: liveMetric(totalViews) },
  ];

  const engagementKpis: KpiMetric[] = [
    { label: "Total reactions/likes", value: liveMetric(videoLikes) },
    { label: "Total comments", value: liveMetric(videoComments) },
    { label: "Total shares", value: liveMetric(videoShares) },
    {
      label: "Engagement rate",
      value: engagementRate ?? "No live data yet",
    },
  ];

  const lastSyncAt = integration?.last_sync_at
    ? new Date(integration.last_sync_at).toISOString()
    : null;

  const accountSynced = Boolean(accountSnapshot);
  const postsSynced = videoRows.length > 0;
  const insightsSynced =
    totalViews != null ||
    videoLikes != null ||
    videoComments != null ||
    videoShares != null;

  const statusRows: StatusRow[] = [
    {
      label: "TikTok account connected",
      ok: integration?.status === "ACTIVE",
      detail: integration?.account_name ?? integration?.account_id ?? "None",
    },
    {
      label: "Account sync status",
      ok: accountSynced,
      detail: accountSynced ? "Synced" : "Not synced yet",
    },
    {
      label: "Posts/videos sync status",
      ok: postsSynced,
      detail: postsSynced ? `${videoRows.length} videos` : "Not synced yet",
    },
    {
      label: "Insights sync status",
      ok: insightsSynced,
      detail: insightsSynced ? "Available" : "Waiting for API metrics",
    },
    {
      label: "Last sync",
      ok: Boolean(lastSyncAt),
      detail: lastSyncAt ?? "Never",
    },
  ];

  if (missingScopes.length > 0) {
    statusRows.push({
      label: "Missing permissions",
      ok: false,
      detail: missingScopes.join(", "),
    });
  }

  return {
    brandId: brand.id,
    brandName: brand.name,
    brandSlug: brand.slug,
    integrationId: integration?.id ?? null,
    openId: integration?.account_id ?? null,
    accountName: integration?.account_name ?? null,
    connectionStatus: connectionStatusFromIntegration(
      integration?.status ?? null,
    ),
    status: integration?.status ?? null,
    lastSyncAt,
    lastError: integration?.last_error ?? null,
    missingScopes,
    apiConfigured,
    statusRows,
    overviewKpis,
    engagementKpis,
    contentPerformance,
    syncHistory: await loadTikTokSyncHistory(integration?.id ?? null),
  };
}

function mergeConnectionStatus(
  brands: TikTokBrandDashboard[],
): PlatformConnectionStatus {
  const connected = brands.filter((b) => b.connectionStatus === "Connected");
  const needsReconnect = brands.some(
    (b) => b.connectionStatus === "Reconnect required",
  );
  const lastSync = brands
    .map((b) => b.lastSyncAt)
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? null;
  const lastError =
    brands.find((b) => b.lastError)?.lastError ?? null;

  return {
    platform: "TIKTOK",
    isDemo: false,
    apiConnected: connected.length > 0,
    webhookSupported: false,
    webhookConfigured: false,
    cronConfigured: Boolean(process.env.META_CRON_SECRET?.trim()),
    connectedAccountsCount: connected.length,
    lastSyncAt: lastSync,
    lastSyncError: lastError,
    tokenStatus: connected.length ? "OK" : "Missing",
    syncHealth: needsReconnect
      ? "Failed"
      : connected.length
        ? "OK"
        : "Needs sync",
    statusRows: [
      {
        label: "TikTok OAuth configured",
        ok: isTikTokOAuthConfigured(),
        detail: isTikTokOAuthConfigured() ? "Ready" : "Missing env vars",
      },
      {
        label: "Connected brands",
        ok: connected.length > 0,
        detail: String(connected.length),
      },
      {
        label: "Last sync",
        ok: Boolean(lastSync),
        detail: lastSync ?? "Never",
      },
    ],
  };
}

export async function loadTikTokPlatformSlice(input?: {
  profileId?: number | null;
  brandId?: number | null;
}) {
  const brands = await loadBrandsForScope(input?.profileId ?? null);
  const brandDashboards = await Promise.all(
    brands.map((brand) => buildTikTokBrandDashboard(brand)),
  );

  const filtered =
    input?.brandId != null
      ? brandDashboards.filter((b) => b.brandId === input.brandId)
      : brandDashboards;

  const accounts: PlatformAccount[] = brandDashboards.map((brand) => ({
    id: String(brand.brandId),
    platform: "TIKTOK",
    accountType: "tiktok_brand",
    accountName: brand.accountName ?? brand.brandName,
    externalAccountId: brand.openId ?? String(brand.brandId),
    isDemo: false,
    lastSyncedAt: brand.lastSyncAt,
  }));

  const primary =
    filtered[0] ??
    brandDashboards[0] ??
    null;

  const connection = mergeConnectionStatus(brandDashboards);

  const overviewKpis = primary?.overviewKpis ?? [];
  const engagementKpis = primary?.engagementKpis ?? [];
  const contentPerformance = (filtered.length > 0 ? filtered : brandDashboards).flatMap(
    (b) => b.contentPerformance,
  );

  const syncHistory = (
    primary?.syncHistory ??
    brandDashboards.flatMap((b) => b.syncHistory)
  ).slice(0, 20);

  const charts: PlatformChartConfig[] = [];

  return {
    isDemo: false,
    accounts,
    connection,
    overviewKpis,
    engagementKpis,
    audienceInsightKpis: [] as KpiMetric[],
    growthSnapshots: [] as GrowthSnapshotRow[],
    contentPerformance,
    campaignPerformance: [],
    activityLogs: [] as ActivityLogRow[],
    syncHistory,
    charts,
    metaNeedsBootstrap: false,
    metaBusinessPages: [],
    tiktokBrandAnalytics: brandDashboards,
  };
}

export function tiktokBrandIdFromFilter(accountId: string | null) {
  if (!accountId || accountId === "all") {
    return null;
  }
  const parsed = Number(accountId);
  return Number.isFinite(parsed) ? parsed : null;
}
