import "server-only"

import { query } from "@/lib/db"
import { getMetaIntegrationStatus, getMetaEnvChecklist } from "@/lib/meta/connection-status"
import type { MetaPageConfig, MetaPageConfigKey } from "@/lib/meta/pages-config"
import { getActiveMetaPages } from "@/lib/meta/pages-config"
import type { MetaSyncRunSummary } from "@/lib/meta/monitoring-data"
import type {
  MetaPageDailySnapshotRow,
  MetaPostMetricsRow,
} from "@/lib/meta/types"

export type MetaBusinessPageInsightSummary = {
  pageImpressions: number | null
  pageImpressionsUnique: number | null
  pageEngagedUsers: number | null
  pagePostEngagements: number | null
  pageViewsTotal: number | null
  pageFanAdds: number | null
  insightsUnavailable: boolean
}

export type MetaBusinessPagePostRow = {
  id: number
  postId: string
  message: string | null
  publishedAt: string | null
  permalink: string | null
  imageUrl: string | null
  reactions: number
  comments: number
  shares: number
  engagementTotal: number
}

export type MetaBusinessPageDashboard = {
  key: MetaPageConfigKey
  displayName: string
  platformLabel: string
  facebookPageId: string | null
  pageName: string | null
  connectionStatus: "Connected" | "Not connected" | "Needs configuration"
  facebookPageStatus: "Connected" | "Not connected"
  instagramStatus: "Not connected yet"
  pageAccessTokenStatus: "OK" | "Missing"
  cronStatus: "OK" | "Missing"
  lastSyncAt: string | null
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
  }
  insights: MetaBusinessPageInsightSummary
  allPosts: MetaBusinessPagePostRow[]
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
  const insights = metrics?.insights

  if (!parsed || typeof parsed !== "object") {
    return {
      pageImpressions: null,
      pageImpressionsUnique: null,
      pageEngagedUsers: null,
      pagePostEngagements: null,
      pageViewsTotal: null,
      pageFanAdds: null,
      insightsUnavailable: Array.isArray(insights) && insights.length === 0,
    }
  }

  return {
    pageImpressions: parsed.page_impressions ?? null,
    pageImpressionsUnique: parsed.page_impressions_unique ?? null,
    pageEngagedUsers: parsed.page_engaged_users ?? null,
    pagePostEngagements: parsed.page_post_engagements ?? null,
    pageViewsTotal: parsed.page_views_total ?? null,
    pageFanAdds: parsed.page_fan_adds ?? null,
    insightsUnavailable: false,
  }
}

function mapPostRow(post: MetaPostMetricsRow): MetaBusinessPagePostRow {
  const insights = post.insights as Record<string, unknown> | undefined
  const imageUrl =
    typeof insights?.picture_url === "string" ? insights.picture_url : null

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
    reactions,
    comments,
    shares,
    engagementTotal: reactions + comments + shares,
  }
}

async function loadPageAnalytics(
  config: MetaPageConfig,
  integration: Awaited<ReturnType<typeof getMetaIntegrationStatus>>,
  pageChecklist: ReturnType<typeof getMetaEnvChecklist>["pages"][number]
) {
  const pageId = config.pageId

  const [dbPage, snapshots, postTotals, allPosts, recentSyncRuns] =
    await Promise.all([
      query<{ page_name: string; last_synced_at: Date | null }>(
        `
        SELECT page_name, last_synced_at
        FROM meta_facebook_page
        WHERE facebook_page_id = $1 AND is_active = true
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
        ORDER BY snapshot_date DESC
        LIMIT 30
        `,
        [pageId]
      ),
      query<{ reactions: string; comments: string; shares: string }>(
        `
        SELECT
          COALESCE(SUM(reactions_count), 0)::text AS reactions,
          COALESCE(SUM(comments_count), 0)::text AS comments,
          COALESCE(SUM(shares_count), 0)::text AS shares
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
        ORDER BY published_at DESC NULLS LAST, id DESC
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
        LIMIT 5
        `,
        [pageId]
      ),
    ])

  const latestSnapshot = snapshots.rows[0]
  const previousSnapshot = snapshots.rows[1]
  const latestFollowers = latestSnapshot?.followers_count ?? null
  const previousFollowers = previousSnapshot?.followers_count ?? null
  const latestLikes = latestSnapshot?.page_likes ?? null
  const previousLikes = previousSnapshot?.page_likes ?? null

  const insights = parsePageInsightsFromSnapshot(
    latestSnapshot?.metrics as Record<string, unknown> | undefined
  )

  const reactions = Number(postTotals.rows[0]?.reactions ?? 0)
  const comments = Number(postTotals.rows[0]?.comments ?? 0)
  const shares = Number(postTotals.rows[0]?.shares ?? 0)
  const mappedPosts = allPosts.rows.map(mapPostRow)
  const topPost = mappedPosts.reduce<MetaBusinessPagePostRow | null>(
    (best, post) => {
      if (!best || post.engagementTotal > best.engagementTotal) {
        return post
      }
      return best
    },
    null
  )

  const tokenReady = pageChecklist.ready
  const hasDbPage = dbPage.rows.length > 0
  const lastSyncRow = dbPage.rows[0]?.last_synced_at

  return {
    key: config.key,
    displayName: config.displayName,
    platformLabel: "Facebook",
    facebookPageId: pageId,
    pageName: dbPage.rows[0]?.page_name ?? config.displayName,
    connectionStatus: tokenReady && hasDbPage ? "Connected" : "Not connected",
    facebookPageStatus: hasDbPage && tokenReady ? "Connected" : "Not connected",
    instagramStatus: "Not connected yet" as const,
    pageAccessTokenStatus: pageChecklist.tokenConfigured ? "OK" : "Missing",
    cronStatus: integration.cronConfigured ? "OK" : "Missing",
    lastSyncAt: lastSyncRow ? new Date(lastSyncRow).toISOString() : null,
    metrics: {
      totalFollowers: latestFollowers,
      pageLikes: latestLikes,
      newFollowers:
        latestFollowers !== null && previousFollowers !== null
          ? latestFollowers - previousFollowers
          : null,
      newLikes:
        latestLikes !== null && previousLikes !== null
          ? latestLikes - previousLikes
          : null,
      postEngagements: reactions + comments + shares,
      reactions,
      comments,
      shares,
      reach: insights.pageImpressions,
      impressions: insights.pageImpressionsUnique,
      profileVisits: insights.pageViewsTotal,
      linkClicks: null,
      topPerformingPost: topPost?.message
        ? topPost.message.slice(0, 80)
        : null,
    },
    insights,
    allPosts: mappedPosts,
    growthSnapshots: snapshots.rows.map((row) => ({
      id: row.id,
      date: row.snapshot_date,
      followers: row.followers_count,
      pageLikes: row.page_likes,
    })),
    recentSyncRuns: recentSyncRuns.rows,
  } satisfies MetaBusinessPageDashboard
}

function buildUnconfiguredPageDashboard(
  config: MetaPageConfig,
  integration: Awaited<ReturnType<typeof getMetaIntegrationStatus>>,
  pageChecklist: ReturnType<typeof getMetaEnvChecklist>["pages"][number]
): MetaBusinessPageDashboard {
  return {
    key: config.key,
    displayName: config.displayName,
    platformLabel: "Facebook",
    facebookPageId: config.pageId || null,
    pageName: config.displayName,
    connectionStatus: "Needs configuration",
    facebookPageStatus: "Not connected",
    instagramStatus: "Not connected yet",
    pageAccessTokenStatus: pageChecklist.tokenConfigured ? "OK" : "Missing",
    cronStatus: integration.cronConfigured ? "OK" : "Missing",
    lastSyncAt: null,
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
    },
    insights: {
      pageImpressions: null,
      pageImpressionsUnique: null,
      pageEngagedUsers: null,
      pagePostEngagements: null,
      pageViewsTotal: null,
      pageFanAdds: null,
      insightsUnavailable: false,
    },
    allPosts: [],
    growthSnapshots: [],
    recentSyncRuns: [],
  }
}

export async function getMetaBusinessPagesAnalytics(): Promise<
  MetaBusinessPageDashboard[]
> {
  const activePages = getActiveMetaPages()
  if (activePages.length === 0) {
    return []
  }

  const integration = await getMetaIntegrationStatus()
  const checklist = getMetaEnvChecklist()

  const results: MetaBusinessPageDashboard[] = []

  for (const config of activePages) {
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
      results.push(buildUnconfiguredPageDashboard(config, integration, pageChecklist))
      continue
    }

    results.push(
      await loadPageAnalytics(config, integration, pageChecklist)
    )
  }

  return results
}
