import "server-only"

import { query } from "@/lib/db"
import {
  getMetaIntegrationStatus,
  getMetaEnvChecklist,
} from "@/lib/meta/connection-status"
import { resolveMetaAnalyticsWindow } from "@/lib/meta/date-range"
import { classifyMetaGraphError } from "@/lib/meta/graph-errors"
import { POSTS_PERMISSION_MESSAGE } from "@/lib/meta/graph-api"
import {
  sumParsedMetricsInSnapshots,
  sumParsedMetricsWithFallback,
} from "@/lib/meta/insights-aggregate"
import {
  resolveEffectivePageAccessToken,
  type ResolvedPageTokenSource,
} from "@/lib/meta/page-token"
import type { MetaPageConfig, MetaPageConfigKey } from "@/lib/meta/pages-config"
import { getEnabledMetaPages } from "@/lib/meta/pages-config"
import type { MetaSyncRunSummary } from "@/lib/meta/monitoring-data"
import type {
  MetaPageDailySnapshotRow,
  MetaPostMetricsRow,
} from "@/lib/meta/types"
import type { MetaMetricDisplayState } from "@/lib/platform-analytics/format"
import type { AnalyticsDateRange } from "@/lib/platform-analytics/types"

export type MetaBusinessPageInsightSummary = {
  pageImpressions: number | null
  pageImpressionsUnique: number | null
  pageEngagedUsers: number | null
  pagePostEngagements: number | null
  pageViewsTotal: number | null
  pageFanAdds: number | null
  pageFans: number | null
  pageFollows: number | null
  insightsUnavailable: boolean
  insightsPermissionDenied: boolean
  insightsSyncFailed: boolean
}

export type MetaBusinessPagePostRow = {
  id: number
  postId: string
  message: string | null
  publishedAt: string | null
  permalink: string | null
  imageUrl: string | null
  postType: string | null
  reactions: number
  comments: number
  shares: number
  engagementTotal: number
}

export type MetaPostPreviewSection = {
  totalSynced: number
  lastPostsSyncAt: string | null
  topPerforming: MetaBusinessPagePostRow | null
  topPerformingState: MetaMetricDisplayState
  topPosts: MetaBusinessPagePostRow[]
  latestPosts: MetaBusinessPagePostRow[]
}

export type MetaCapabilityStatus =
  | "Available"
  | "Connected"
  | "Not connected yet"
  | "Permission required"
  | "Sync failed"
  | "No live data yet"

export type MetaPermissionCapabilities = {
  pageAccessToken: "OK" | "Missing" | "Expired" | "Invalid"
  pageSummary: MetaCapabilityStatus
  posts: MetaCapabilityStatus
  insights: MetaCapabilityStatus
  webhooks: "Connected" | "Not connected"
  ads: "Not connected" | "Available"
}

export type MetaSyncJobDisplayStatus = "Success" | "Failed" | "Never"

export type MetaSourceSyncStatus =
  | "success"
  | "partial"
  | "failed"
  | "missing_token"
  | "no_data"

export type MetaBusinessPageDashboard = {
  key: MetaPageConfigKey
  displayName: string
  platformLabel: string
  dateRangeLabel: string
  facebookPageId: string | null
  pageName: string | null
  connectionStatus: "Connected" | "Not connected" | "Needs configuration"
  facebookPageStatus: "Connected" | "Not connected"
  instagramStatus: "Not connected yet"
  pageAccessTokenStatus: "OK" | "Missing" | "Expired" | "Invalid"
  cronStatus: "OK" | "Missing"
  tokenSource: ResolvedPageTokenSource | null
  tokenResolutionHint: string | null
  lastSyncAt: string | null
  pageSummarySyncStatus: MetaSourceSyncStatus
  postsSyncStatus: MetaSourceSyncStatus
  insightsSyncStatus: MetaSourceSyncStatus
  postsSyncStatusLegacy: MetaSyncJobDisplayStatus
  insightsSyncStatusLegacy: MetaSyncJobDisplayStatus
  postsUnavailableMessage: string | null
  permissions: MetaPermissionCapabilities
  metrics: {
    totalFollowers: number | null
    pageLikes: number | null
    newFollowers: number | null
    newLikes: number | null
    postEngagements: number | null
    reactions: number
    comments: number
    shares: number
    reach: number | null
    impressions: number | null
    profileVisits: number | null
    linkClicks: number | null
    topPerformingPost: string | null
    topPerformingPostId: string | null
    states: {
      totalFollowers: MetaMetricDisplayState
      pageLikes: MetaMetricDisplayState
      newFollowers: MetaMetricDisplayState
      newLikes: MetaMetricDisplayState
      postEngagements: MetaMetricDisplayState
      reactions: MetaMetricDisplayState
      comments: MetaMetricDisplayState
      shares: MetaMetricDisplayState
      reach: MetaMetricDisplayState
      impressions: MetaMetricDisplayState
      profileVisits: MetaMetricDisplayState
      linkClicks: MetaMetricDisplayState
      topPerformingPost: MetaMetricDisplayState
    }
  }
  insights: MetaBusinessPageInsightSummary
  postPreview: MetaPostPreviewSection
  growthSnapshots: Array<{
    id: number
    date: string
    followers: number | null
    pageLikes: number | null
  }>
  recentSyncRuns: MetaSyncRunSummary[]
}

function parsePageInsightsFromSnapshot(
  metrics: Record<string, unknown> | null | undefined
): MetaBusinessPageInsightSummary {
  const parsed = metrics?.parsed as Record<string, number> | undefined
  const permissionDenied = Boolean(metrics?.insights_permission_denied)
  const syncFailed =
    Boolean(metrics?.insights_sync_failed) && !metrics?.insights_partial

  if (!parsed || typeof parsed !== "object") {
    return {
      pageImpressions: null,
      pageImpressionsUnique: null,
      pageEngagedUsers: null,
      pagePostEngagements: null,
      pageViewsTotal: null,
      pageFanAdds: null,
      pageFans: null,
      pageFollows: null,
      insightsUnavailable: permissionDenied,
      insightsPermissionDenied: permissionDenied,
      insightsSyncFailed: syncFailed && !permissionDenied,
    }
  }

  return {
    pageImpressions: parsed.page_impressions ?? null,
    pageImpressionsUnique: parsed.page_impressions_unique ?? null,
    pageEngagedUsers: parsed.page_engaged_users ?? null,
    pagePostEngagements: parsed.page_post_engagements ?? null,
    pageViewsTotal: parsed.page_views_total ?? null,
    pageFanAdds: parsed.page_fan_adds ?? null,
    pageFans: parsed.page_fans ?? null,
    pageFollows: parsed.page_follows ?? null,
    insightsUnavailable: false,
    insightsPermissionDenied: permissionDenied,
    insightsSyncFailed: false,
  }
}

export function mapPostMetricsRow(post: MetaPostMetricsRow): MetaBusinessPagePostRow {
  const insights = post.insights as Record<string, unknown> | undefined
  const imageUrl =
    typeof insights?.picture_url === "string" ? insights.picture_url : null
  const postType =
    typeof insights?.post_type === "string" ? insights.post_type : null

  const reactions = post.reactions_count
  const comments = post.comments_count
  const shares = post.shares_count

  return {
    id: post.id,
    postId: post.post_id,
    message: post.message,
    publishedAt: post.published_at
      ? new Date(post.published_at).toISOString()
      : null,
    permalink: post.permalink,
    imageUrl,
    postType,
    reactions,
    comments,
    shares,
    engagementTotal: reactions + comments + shares,
  }
}

function getLastSyncRun(
  runs: MetaSyncRunSummary[],
  syncType: string
): MetaSyncRunSummary | undefined {
  return runs.find((run) => run.sync_type === syncType)
}

function syncJobDisplayStatus(
  run: MetaSyncRunSummary | undefined
): MetaSyncJobDisplayStatus {
  if (!run) {
    return "Never"
  }
  return run.status === "SUCCESS" ? "Success" : "Failed"
}

function runIndicatesPermissionDenied(run: MetaSyncRunSummary | undefined) {
  if (!run?.error_log) {
    return false
  }
  return classifyMetaGraphError(new Error(run.error_log)).permissionDenied
}

function runIndicatesTokenExpired(run: MetaSyncRunSummary | undefined) {
  if (!run?.error_log) {
    return false
  }
  return classifyMetaGraphError(new Error(run.error_log)).tokenExpired
}

function capabilityFromSyncRun(
  run: MetaSyncRunSummary | undefined,
  hasData: boolean,
  connected: boolean
): MetaCapabilityStatus {
  if (!connected) {
    return "Not connected yet"
  }
  if (!run) {
    return hasData ? "Available" : "No live data yet"
  }
  if (run.status === "SUCCESS") {
    return hasData ? "Available" : "Connected"
  }
  if (runIndicatesPermissionDenied(run)) {
    return "Permission required"
  }
  return "Sync failed"
}

function runIndicatesTokenInvalid(run: MetaSyncRunSummary | undefined) {
  if (!run?.error_log) {
    return false
  }
  return classifyMetaGraphError(new Error(run.error_log)).tokenInvalid
}

function runIndicatesApplicationDeleted(run: MetaSyncRunSummary | undefined) {
  if (!run?.error_log) {
    return false
  }
  return classifyMetaGraphError(new Error(run.error_log)).applicationDeleted
}

function resolveSourceSyncStatus(input: {
  tokenConfigured: boolean
  run: MetaSyncRunSummary | undefined
  hasStoredData: boolean
}): MetaSourceSyncStatus {
  if (!input.tokenConfigured) {
    return "missing_token"
  }
  if (!input.run) {
    return input.hasStoredData ? "success" : "no_data"
  }
  if (input.run.status === "SUCCESS") {
    return "success"
  }
  return input.hasStoredData ? "partial" : "failed"
}

function legacySyncStatus(
  status: MetaSourceSyncStatus
): MetaSyncJobDisplayStatus {
  if (status === "success" || status === "partial") {
    return "Success"
  }
  if (status === "failed") {
    return "Failed"
  }
  return "Never"
}

function metricState(input: {
  value: number | null | undefined
  sourceStatus: MetaSourceSyncStatus
  permissionDenied?: boolean
  metricSyncFailed?: boolean
  unavailable?: boolean
}): MetaMetricDisplayState {
  if (input.value !== null && input.value !== undefined) {
    return "available"
  }
  if (input.permissionDenied) {
    return "permission"
  }
  if (input.unavailable) {
    return "unavailable"
  }
  if (input.metricSyncFailed || input.sourceStatus === "failed") {
    return "sync_failed"
  }
  return "no_data"
}

function insightMetricState(input: {
  value: number | null
  sourceStatus: MetaSourceSyncStatus
  permissionDenied: boolean
  metricAttempted: boolean
}): MetaMetricDisplayState {
  if (input.value !== null) {
    return "available"
  }
  if (input.permissionDenied) {
    return "permission"
  }
  if (!input.metricAttempted) {
    return "no_data"
  }
  if (input.sourceStatus === "failed") {
    return "sync_failed"
  }
  return "no_data"
}

async function loadPageAnalytics(
  config: MetaPageConfig,
  integration: Awaited<ReturnType<typeof getMetaIntegrationStatus>>,
  pageChecklist: ReturnType<typeof getMetaEnvChecklist>["pages"][number],
  dateRange: AnalyticsDateRange = "28d",
  customDates?: { from?: string | null; to?: string | null }
) {
  const pageId = config.pageId
  const window = resolveMetaAnalyticsWindow(dateRange, customDates)

  const [
    dbPage,
    latestPageSummary,
    snapshots,
    postTotals,
    postCount,
    allTimePostCount,
    topPostsRows,
    allTimeTopPostRows,
    latestPostsRows,
    recentSyncRuns,
  ] = await Promise.all([
      query<{ page_name: string; last_synced_at: Date | null }>(
        `
        SELECT page_name, last_synced_at
        FROM meta_facebook_page
        WHERE facebook_page_id = $1 AND is_active = true
        LIMIT 1
        `,
        [pageId]
      ),
      query<{
        followers_count: number | null
        page_likes: number | null
        snapshot_date: string
      }>(
        `
        SELECT
          followers_count,
          page_likes,
          snapshot_date::text
        FROM meta_page_daily_snapshot
        WHERE facebook_page_id = $1
          AND (followers_count IS NOT NULL OR page_likes IS NOT NULL)
        ORDER BY snapshot_date DESC
        LIMIT 1
        `,
        [pageId]
      ),
      query<MetaPageDailySnapshotRow>(
        `
        SELECT
          id,
          facebook_page_id,
          snapshot_date::text,
          followers_count,
          page_likes,
          metrics
        FROM meta_page_daily_snapshot
        WHERE facebook_page_id = $1
          AND snapshot_date >= $2::date
          AND snapshot_date <= $3::date
        ORDER BY snapshot_date DESC
        `,
        [pageId, window.since, window.until]
      ),
      query<{ reactions: string; comments: string; shares: string }>(
        `
        SELECT
          COALESCE(SUM(reactions_count), 0)::text AS reactions,
          COALESCE(SUM(comments_count), 0)::text AS comments,
          COALESCE(SUM(shares_count), 0)::text AS shares
        FROM meta_post_metrics
        WHERE facebook_page_id = $1
          AND published_at >= $2::timestamptz
          AND published_at < ($3::date + interval '1 day')
        `,
        [pageId, window.since, window.until]
      ),
      query<{ count: string }>(
        `
        SELECT COUNT(*)::text AS count
        FROM meta_post_metrics
        WHERE facebook_page_id = $1
          AND published_at >= $2::timestamptz
          AND published_at < ($3::date + interval '1 day')
        `,
        [pageId, window.since, window.until]
      ),
      query<{ count: string }>(
        `
        SELECT COUNT(*)::text AS count
        FROM meta_post_metrics
        WHERE facebook_page_id = $1
        `,
        [pageId]
      ),
      query<MetaPostMetricsRow>(
        `
        SELECT
          id,
          facebook_page_id,
          post_id,
          message,
          permalink,
          published_at,
          reactions_count,
          comments_count,
          shares_count,
          engagement_rate::text,
          performance_rank,
          insights,
          last_synced_at
        FROM meta_post_metrics
        WHERE facebook_page_id = $1
          AND published_at >= $2::timestamptz
          AND published_at < ($3::date + interval '1 day')
        ORDER BY
          reactions_count + comments_count + shares_count DESC,
          published_at DESC NULLS LAST
        LIMIT 3
        `,
        [pageId, window.since, window.until]
      ),
      query<MetaPostMetricsRow>(
        `
        SELECT
          id,
          facebook_page_id,
          post_id,
          message,
          permalink,
          published_at,
          reactions_count,
          comments_count,
          shares_count,
          engagement_rate::text,
          performance_rank,
          insights,
          last_synced_at
        FROM meta_post_metrics
        WHERE facebook_page_id = $1
        ORDER BY
          reactions_count + comments_count + shares_count DESC,
          published_at DESC NULLS LAST
        LIMIT 1
        `,
        [pageId]
      ),
      query<MetaPostMetricsRow>(
        `
        SELECT
          id,
          facebook_page_id,
          post_id,
          message,
          permalink,
          published_at,
          reactions_count,
          comments_count,
          shares_count,
          engagement_rate::text,
          performance_rank,
          insights,
          last_synced_at
        FROM meta_post_metrics
        WHERE facebook_page_id = $1
        ORDER BY published_at DESC NULLS LAST, id DESC
        LIMIT 3
        `,
        [pageId]
      ),
      query<MetaSyncRunSummary>(
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
        WHERE facebook_page_id = $1
        ORDER BY started_at DESC
        LIMIT 20
        `,
        [pageId]
      ),
    ])

  const pageSummaryRow = latestPageSummary.rows[0]
  const totalFollowers = pageSummaryRow?.followers_count ?? null
  const pageLikes = pageSummaryRow?.page_likes ?? null

  const insightsSnapshot = snapshots.rows[0]
  const insights = parsePageInsightsFromSnapshot(
    insightsSnapshot?.metrics as Record<string, unknown> | undefined
  )
  const insightsPermissionDenied = insights.insightsPermissionDenied

  const reachFromInsights = sumParsedMetricsInSnapshots(
    snapshots.rows,
    "page_impressions_unique",
    window.since,
    window.until
  )
  const impressionsFromInsights = sumParsedMetricsInSnapshots(
    snapshots.rows,
    "page_impressions",
    window.since,
    window.until
  )
  const postEngagementsFromInsights = sumParsedMetricsInSnapshots(
    snapshots.rows,
    "page_post_engagements",
    window.since,
    window.until
  )
  const profileVisitsFromInsights = sumParsedMetricsInSnapshots(
    snapshots.rows,
    "page_views_total",
    window.since,
    window.until
  )
  const newLikesFromInsights = sumParsedMetricsWithFallback(
    snapshots.rows,
    ["page_fan_adds"],
    window.since,
    window.until
  )
  const newFollowersFromInsights = sumParsedMetricsWithFallback(
    snapshots.rows,
    ["page_daily_follows", "page_daily_follows_unique", "page_follows"],
    window.since,
    window.until
  )
  const insightsMetricAttempted = snapshots.rows.some((row) => {
    const parsed = row.metrics?.parsed as Record<string, number> | undefined
    return Boolean(parsed && Object.keys(parsed).length > 0)
  })

  const linkClicksFromInsights = sumParsedMetricsInSnapshots(
    snapshots.rows,
    "page_total_actions",
    window.since,
    window.until
  )

  const reactions = Number(postTotals.rows[0]?.reactions ?? 0)
  const comments = Number(postTotals.rows[0]?.comments ?? 0)
  const shares = Number(postTotals.rows[0]?.shares ?? 0)
  const totalSyncedInRange = Number(postCount.rows[0]?.count ?? 0)
  const totalPostsStored = Number(allTimePostCount.rows[0]?.count ?? 0)
  const topPosts = topPostsRows.rows.map(mapPostMetricsRow)
  const latestPosts = latestPostsRows.rows.map(mapPostMetricsRow)
  const topPostInRange = topPosts[0] ?? null
  const topPostAllTime = allTimeTopPostRows.rows[0]
    ? mapPostMetricsRow(allTimeTopPostRows.rows[0])
    : null
  const topPost = topPostInRange ?? topPostAllTime

  const runs = recentSyncRuns.rows
  const dailyPageRun = getLastSyncRun(runs, "daily_page")
  const hourlyPostsRun = getLastSyncRun(runs, "hourly_posts")
  const dailyInsightsRun = getLastSyncRun(runs, "daily_insights")

  const postsPermissionDenied = runIndicatesPermissionDenied(hourlyPostsRun)

  const pageSummarySyncStatus = resolveSourceSyncStatus({
    tokenConfigured: pageChecklist.tokenConfigured,
    run: dailyPageRun,
    hasStoredData: totalFollowers !== null || pageLikes !== null,
  })
  const postsSyncStatus = resolveSourceSyncStatus({
    tokenConfigured: pageChecklist.tokenConfigured,
    run: hourlyPostsRun,
    hasStoredData: totalPostsStored > 0,
  })
  const insightsSyncStatus = resolveSourceSyncStatus({
    tokenConfigured: pageChecklist.tokenConfigured,
    run: dailyInsightsRun,
    hasStoredData:
      reachFromInsights !== null ||
      impressionsFromInsights !== null ||
      postEngagementsFromInsights !== null ||
      insightsMetricAttempted,
  })

  const pageSummaryTokenFailed =
    runIndicatesTokenExpired(dailyPageRun) ||
    runIndicatesTokenInvalid(dailyPageRun) ||
    runIndicatesApplicationDeleted(dailyPageRun)

  const pageAccessTokenStatus = !pageChecklist.tokenConfigured
    ? "Missing"
    : pageSummarySyncStatus === "success" || pageSummarySyncStatus === "partial"
      ? "OK"
      : runIndicatesApplicationDeleted(dailyPageRun)
        ? "Invalid"
        : pageSummaryTokenFailed && runIndicatesTokenExpired(dailyPageRun)
          ? "Expired"
          : pageSummaryTokenFailed && runIndicatesTokenInvalid(dailyPageRun)
            ? "Invalid"
            : "OK"

  const tokenReady = pageChecklist.ready
  const hasDbPage = dbPage.rows.length > 0
  const lastSyncRow = dbPage.rows[0]?.last_synced_at

  const hasSummaryData = totalFollowers !== null || pageLikes !== null
  const pageConnected = tokenReady && hasDbPage

  const permissions: MetaPermissionCapabilities = {
    pageAccessToken: pageAccessTokenStatus,
    pageSummary: capabilityFromSyncRun(
      dailyPageRun,
      hasSummaryData,
      pageConnected
    ),
    posts: capabilityFromSyncRun(
      hourlyPostsRun,
      totalPostsStored > 0,
      pageConnected
    ),
    insights: insightsPermissionDenied
      ? "Permission required"
      : capabilityFromSyncRun(
          dailyInsightsRun,
          insightsSyncStatus === "success" || insightsSyncStatus === "partial",
          pageConnected
        ),
    webhooks: "Not connected",
    ads: "Not connected",
  }

  const postsUnavailableMessage =
    postsPermissionDenied || permissions.posts === "Permission required"
      ? POSTS_PERMISSION_MESSAGE
      : null

  let tokenSource: ResolvedPageTokenSource | null = null
  let tokenResolutionHint: string | null = null

  try {
    const resolved = await resolveEffectivePageAccessToken({
      facebookPageId: pageId,
      accessTokenEnvKey: config.accessTokenEnvKey,
    })
    tokenSource = resolved.source
    if (resolved.source === "env_user_token_resolved") {
      tokenResolutionHint =
        "Using Page token resolved from your User token via /me/accounts."
    } else if (resolved.source === "env_page_token") {
      tokenResolutionHint = "Using Page access token from environment."
    }
  } catch {
    tokenResolutionHint = null
  }

  const newFollowers = newFollowersFromInsights
  const newLikes = newLikesFromInsights
  const postEngagements = postEngagementsFromInsights
  const reach = reachFromInsights
  const impressions = impressionsFromInsights
  const profileVisits = profileVisitsFromInsights

  return {
    key: config.key,
    displayName: config.displayName,
    platformLabel: "Facebook",
    dateRangeLabel: window.label,
    facebookPageId: pageId,
    pageName: dbPage.rows[0]?.page_name ?? config.displayName,
    connectionStatus: tokenReady && hasDbPage ? "Connected" : "Not connected",
    facebookPageStatus: hasDbPage && tokenReady ? "Connected" : "Not connected",
    instagramStatus: "Not connected yet" as const,
    pageAccessTokenStatus,
    cronStatus: integration.cronConfigured ? "OK" : "Missing",
    tokenSource,
    tokenResolutionHint,
    lastSyncAt: lastSyncRow ? new Date(lastSyncRow).toISOString() : null,
    pageSummarySyncStatus,
    postsSyncStatus,
    insightsSyncStatus,
    postsSyncStatusLegacy: legacySyncStatus(postsSyncStatus),
    insightsSyncStatusLegacy: legacySyncStatus(insightsSyncStatus),
    postsUnavailableMessage,
    permissions,
    metrics: {
      totalFollowers,
      pageLikes,
      newFollowers,
      newLikes,
      postEngagements,
      reactions: totalPostsStored > 0 ? reactions : 0,
      comments: totalPostsStored > 0 ? comments : 0,
      shares: totalPostsStored > 0 ? shares : 0,
      reach,
      impressions,
      profileVisits,
      linkClicks: linkClicksFromInsights,
      topPerformingPost: topPost?.message
        ? topPost.message.slice(0, 80)
        : null,
      topPerformingPostId: topPost?.postId ?? null,
      states: {
        totalFollowers: metricState({
          value: totalFollowers,
          sourceStatus: pageSummarySyncStatus,
        }),
        pageLikes: metricState({
          value: pageLikes,
          sourceStatus: pageSummarySyncStatus,
        }),
        newFollowers: insightMetricState({
          value: newFollowers,
          sourceStatus: insightsSyncStatus,
          permissionDenied: insightsPermissionDenied,
          metricAttempted: insightsMetricAttempted,
        }),
        newLikes: metricState({
          value: newLikes,
          sourceStatus: insightsSyncStatus,
          permissionDenied: insightsPermissionDenied,
          unavailable:
            insightsMetricAttempted &&
            newLikes === null &&
            insightsSyncStatus !== "failed",
        }),
        postEngagements: metricState({
          value: postEngagements,
          sourceStatus: insightsSyncStatus,
          permissionDenied: insightsPermissionDenied,
          metricSyncFailed:
            postEngagements === null &&
            insightsMetricAttempted &&
            insightsSyncStatus === "failed",
        }),
        reactions: metricState({
          value: totalSyncedInRange > 0 ? reactions : null,
          sourceStatus: postsSyncStatus,
          permissionDenied: postsPermissionDenied,
        }),
        comments: metricState({
          value: totalSyncedInRange > 0 ? comments : null,
          sourceStatus: postsSyncStatus,
          permissionDenied: postsPermissionDenied,
        }),
        shares: metricState({
          value: totalSyncedInRange > 0 ? shares : null,
          sourceStatus: postsSyncStatus,
          permissionDenied: postsPermissionDenied,
        }),
        reach: insightMetricState({
          value: reach,
          sourceStatus: insightsSyncStatus,
          permissionDenied: insightsPermissionDenied,
          metricAttempted: insightsMetricAttempted,
        }),
        impressions: insightMetricState({
          value: impressions,
          sourceStatus: insightsSyncStatus,
          permissionDenied: insightsPermissionDenied,
          metricAttempted: insightsMetricAttempted,
        }),
        profileVisits: insightMetricState({
          value: profileVisits,
          sourceStatus: insightsSyncStatus,
          permissionDenied: insightsPermissionDenied,
          metricAttempted: insightsMetricAttempted,
        }),
        linkClicks: insightMetricState({
          value: linkClicksFromInsights,
          sourceStatus: insightsSyncStatus,
          permissionDenied: insightsPermissionDenied,
          metricAttempted: insightsMetricAttempted,
        }),
        topPerformingPost: metricState({
          value: topPost ? 1 : null,
          sourceStatus: postsSyncStatus,
          permissionDenied: postsPermissionDenied,
        }),
      },
    },
    insights,
    postPreview: {
      totalSynced: totalPostsStored,
      lastPostsSyncAt: hourlyPostsRun?.finished_at
        ? new Date(hourlyPostsRun.finished_at).toISOString()
        : lastSyncRow
          ? new Date(lastSyncRow).toISOString()
          : null,
      topPerforming: topPost,
      topPerformingState: metricState({
        value: topPost ? 1 : null,
        sourceStatus: postsSyncStatus,
        permissionDenied: postsPermissionDenied,
      }),
      topPosts,
      latestPosts,
    },
    growthSnapshots: snapshots.rows.map((row) => ({
      id: row.id,
      date: row.snapshot_date,
      followers: row.followers_count,
      pageLikes: row.page_likes,
    })),
    recentSyncRuns: runs,
  } satisfies MetaBusinessPageDashboard
}

function buildUnconfiguredPageDashboard(
  config: MetaPageConfig,
  integration: Awaited<ReturnType<typeof getMetaIntegrationStatus>>,
  pageChecklist: ReturnType<typeof getMetaEnvChecklist>["pages"][number],
  dateRangeLabel: string
): MetaBusinessPageDashboard {
  const emptyStates = {
    totalFollowers: "no_data" as const,
    pageLikes: "no_data" as const,
    newFollowers: "no_data" as const,
    newLikes: "no_data" as const,
    postEngagements: "no_data" as const,
    reactions: "no_data" as const,
    comments: "no_data" as const,
    shares: "no_data" as const,
    reach: "no_data" as const,
    impressions: "no_data" as const,
    profileVisits: "no_data" as const,
    linkClicks: "no_data" as const,
    topPerformingPost: "no_data" as const,
  }

  return {
    key: config.key,
    displayName: config.displayName,
    platformLabel: "Facebook",
    dateRangeLabel,
    facebookPageId: config.pageId || null,
    pageName: config.displayName,
    connectionStatus: "Needs configuration",
    facebookPageStatus: "Not connected",
    instagramStatus: "Not connected yet",
    pageAccessTokenStatus: pageChecklist.tokenConfigured ? "OK" : "Missing",
    cronStatus: integration.cronConfigured ? "OK" : "Missing",
    tokenSource: null,
    tokenResolutionHint: null,
    lastSyncAt: null,
    pageSummarySyncStatus: "no_data",
    postsSyncStatus: "no_data",
    insightsSyncStatus: "no_data",
    postsSyncStatusLegacy: "Never",
    insightsSyncStatusLegacy: "Never",
    postsUnavailableMessage: null,
    permissions: {
      pageAccessToken: pageChecklist.tokenConfigured ? "OK" : "Missing",
      pageSummary: "Not connected yet",
      posts: "Not connected yet",
      insights: "Not connected yet",
    webhooks: "Not connected",
    ads: "Not connected",
  },
  metrics: {
      totalFollowers: null,
      pageLikes: null,
      newFollowers: null,
      newLikes: null,
      postEngagements: null,
      reactions: 0,
      comments: 0,
      shares: 0,
      reach: null,
      impressions: null,
      profileVisits: null,
      linkClicks: null,
      topPerformingPost: null,
      topPerformingPostId: null,
      states: emptyStates,
    },
    insights: {
      pageImpressions: null,
      pageImpressionsUnique: null,
      pageEngagedUsers: null,
      pagePostEngagements: null,
      pageViewsTotal: null,
      pageFanAdds: null,
      pageFans: null,
      pageFollows: null,
      insightsUnavailable: false,
      insightsPermissionDenied: false,
      insightsSyncFailed: false,
    },
    postPreview: {
      totalSynced: 0,
      lastPostsSyncAt: null,
      topPerforming: null,
      topPerformingState: "no_data",
      topPosts: [],
      latestPosts: [],
    },
    growthSnapshots: [],
    recentSyncRuns: [],
  }
}

export async function getMetaBusinessPagesAnalytics(input?: {
  dateRange?: AnalyticsDateRange
  customDateFrom?: string | null
  customDateTo?: string | null
}): Promise<MetaBusinessPageDashboard[]> {
  const pagesToDisplay = getEnabledMetaPages()

  const dateRange = input?.dateRange ?? "28d"
  const window = resolveMetaAnalyticsWindow(dateRange, {
    from: input?.customDateFrom,
    to: input?.customDateTo,
  })

  const integration = await getMetaIntegrationStatus()
  const checklist = getMetaEnvChecklist()

  const results: MetaBusinessPageDashboard[] = []

  for (const config of pagesToDisplay) {
    const pageChecklist =
      checklist.pages.find((page) => page.key === config.key) ?? {
        key: config.key,
        name: config.name,
        enabled: config.enabled,
        pageIdConfigured: Boolean(config.pageId),
        tokenConfigured: Boolean(config.accessToken),
        ready:
          config.enabled &&
          Boolean(config.pageId) &&
          Boolean(config.accessToken),
      }

    if (!config.pageId || !config.accessToken) {
      results.push(
        buildUnconfiguredPageDashboard(
          config,
          integration,
          pageChecklist,
          window.label
        )
      )
      continue
    }

    results.push(
      await loadPageAnalytics(
        config,
        integration,
        pageChecklist,
        dateRange,
        { from: input?.customDateFrom, to: input?.customDateTo }
      )
    )
  }

  return results
}
