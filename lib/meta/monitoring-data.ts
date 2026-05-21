import "server-only"

import { query } from "@/lib/db"
import type {
  MetaFacebookPageRow,
  MetaPageDailySnapshotRow,
  MetaPostMetricsRow,
  MetaWebhookEventRow,
} from "@/lib/meta/types"

export type MetaMonitoringDashboardData = {
  pages: MetaFacebookPageRow[]
  recentEvents: MetaWebhookEventRow[]
  socialMonitoring: {
    newComments: number
    newReactions: number
    newMentions: number
    newMessages: number
    newLeads: number
  }
  pageAnalytics: {
    totalFollowers: number | null
    newFollowers: number | null
    totalReactions: number
    totalComments: number
    totalShares: number
    growthSnapshots: MetaPageDailySnapshotRow[]
  }
  topPosts: MetaPostMetricsRow[]
}

function countEventsSince(hours: number, pattern: string, pageId?: string | null) {
  const params: unknown[] = [hours, pattern]
  let pageFilter = ""

  if (pageId) {
    pageFilter = "AND page_id = $3"
    params.push(pageId)
  }

  return query<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count
    FROM meta_webhook_event
    WHERE received_at >= now() - ($1::int * interval '1 hour')
      AND (
        event_type ILIKE $2
        OR field_name ILIKE $2
      )
      ${pageFilter}
    `,
    params
  )
}

export async function getMetaMonitoringDashboardData(
  selectedPageId?: string | null
): Promise<MetaMonitoringDashboardData> {
  const pagesResult = await query<MetaFacebookPageRow>(
    `
    SELECT
      id,
      facebook_page_id,
      page_name,
      brand_id,
      access_token_env_key,
      is_active,
      webhook_subscribed_fields,
      last_synced_at
    FROM meta_facebook_page
    WHERE is_active = true
    ORDER BY page_name ASC
    `
  )

  const pageId =
    selectedPageId ??
    pagesResult.rows[0]?.facebook_page_id ??
    null

  const [
    comments,
    reactions,
    mentions,
    messages,
    leads,
    recentEvents,
    snapshots,
    postTotals,
    topPosts,
  ] = await Promise.all([
    countEventsSince(24, "%comment%", pageId),
    countEventsSince(24, "%reaction%", pageId),
    countEventsSince(24, "%mention%", pageId),
    countEventsSince(24, "%message%", pageId),
    countEventsSince(24, "%lead%", pageId),
    query<MetaWebhookEventRow>(
      `
      SELECT
        id,
        event_id,
        object_type,
        page_id,
        field_name,
        post_id,
        comment_id,
        sender_id,
        event_type,
        raw_payload,
        processing_status,
        received_at,
        processed_at,
        error_log
      FROM meta_webhook_event
      ${pageId ? "WHERE page_id = $1" : ""}
      ORDER BY received_at DESC
      LIMIT 50
      `,
      pageId ? [pageId] : []
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
      ${pageId ? "WHERE facebook_page_id = $1" : ""}
      ORDER BY snapshot_date DESC
      LIMIT 30
      `,
      pageId ? [pageId] : []
    ),
    query<{
      reactions: string
      comments: string
      shares: string
    }>(
      `
      SELECT
        COALESCE(SUM(reactions_count), 0)::text AS reactions,
        COALESCE(SUM(comments_count), 0)::text AS comments,
        COALESCE(SUM(shares_count), 0)::text AS shares
      FROM meta_post_metrics
      ${pageId ? "WHERE facebook_page_id = $1" : ""}
      `,
      pageId ? [pageId] : []
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
      ${pageId ? "WHERE facebook_page_id = $1" : ""}
      ORDER BY performance_rank ASC NULLS LAST, published_at DESC NULLS LAST
      LIMIT 20
      `,
      pageId ? [pageId] : []
    ),
  ])

  const latestSnapshot = snapshots.rows[0]
  const previousSnapshot = snapshots.rows[1]
  const latestFollowers = latestSnapshot?.followers_count ?? null
  const previousFollowers = previousSnapshot?.followers_count ?? null

  return {
    pages: pagesResult.rows,
    recentEvents: recentEvents.rows,
    socialMonitoring: {
      newComments: Number(comments.rows[0]?.count ?? 0),
      newReactions: Number(reactions.rows[0]?.count ?? 0),
      newMentions: Number(mentions.rows[0]?.count ?? 0),
      newMessages: Number(messages.rows[0]?.count ?? 0),
      newLeads: Number(leads.rows[0]?.count ?? 0),
    },
    pageAnalytics: {
      totalFollowers: latestFollowers,
      newFollowers:
        latestFollowers !== null && previousFollowers !== null
          ? latestFollowers - previousFollowers
          : null,
      totalReactions: Number(postTotals.rows[0]?.reactions ?? 0),
      totalComments: Number(postTotals.rows[0]?.comments ?? 0),
      totalShares: Number(postTotals.rows[0]?.shares ?? 0),
      growthSnapshots: snapshots.rows,
    },
    topPosts: topPosts.rows,
  }
}
