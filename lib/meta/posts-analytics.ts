import "server-only"

import { query } from "@/lib/db"
import { POSTS_PERMISSION_MESSAGE } from "@/lib/meta/graph-api"
import {
  getMetaBusinessPagesAnalytics,
  mapPostMetricsRow,
  type MetaBusinessPageDashboard,
  type MetaBusinessPagePostRow,
} from "@/lib/meta/page-analytics"
import {
  getMetaPageByKey,
  type MetaPageConfigKey,
} from "@/lib/meta/pages-config"
import type { MetaPostMetricsRow } from "@/lib/meta/types"

export type MetaPostsSort =
  | "latest"
  | "highest_engagement"
  | "most_comments"
  | "most_shares"
  | "most_reactions"

export type MetaPostsListFilters = {
  pageKey: MetaPageConfigKey
  page: number
  pageSize: 10 | 25 | 50
  sort: MetaPostsSort
  search?: string
  dateFrom?: string | null
  dateTo?: string | null
}

export type MetaPostsSummary = {
  totalPosts: number
  totalReactions: number
  totalComments: number
  totalShares: number
  totalEngagement: number
  averageEngagementPerPost: number
  highestPerformingPost: MetaBusinessPagePostRow | null
}

export type MetaPostsPageData = {
  page: MetaBusinessPageDashboard
  summary: MetaPostsSummary
  posts: MetaBusinessPagePostRow[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
  postsUnavailableMessage: string | null
}

const POST_SELECT = `
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
`

function sortOrderClause(sort: MetaPostsSort) {
  switch (sort) {
    case "highest_engagement":
      return "reactions_count + comments_count + shares_count DESC, published_at DESC NULLS LAST"
    case "most_comments":
      return "comments_count DESC, published_at DESC NULLS LAST"
    case "most_shares":
      return "shares_count DESC, published_at DESC NULLS LAST"
    case "most_reactions":
      return "reactions_count DESC, published_at DESC NULLS LAST"
    case "latest":
    default:
      return "published_at DESC NULLS LAST, id DESC"
  }
}

export async function getMetaPostsPageData(
  filters: MetaPostsListFilters
): Promise<MetaPostsPageData | null> {
  const config = getMetaPageByKey(filters.pageKey)
  if (!config?.enabled || !config.pageId || !config.accessToken) {
    return null
  }

  const pages = await getMetaBusinessPagesAnalytics()
  const page = pages.find((entry) => entry.key === filters.pageKey)
  if (!page?.facebookPageId) {
    return null
  }

  const pageId = page.facebookPageId
  const offset = (filters.page - 1) * filters.pageSize
  const params: unknown[] = [pageId]
  const conditions = ["facebook_page_id = $1"]

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`)
    conditions.push(`message ILIKE $${params.length}`)
  }

  if (filters.dateFrom) {
    params.push(filters.dateFrom)
    conditions.push(`published_at >= $${params.length}::timestamptz`)
  }

  if (filters.dateTo) {
    params.push(`${filters.dateTo}T23:59:59.999Z`)
    conditions.push(`published_at <= $${params.length}::timestamptz`)
  }

  const whereClause = conditions.join(" AND ")
  const orderClause = sortOrderClause(filters.sort)

  const [summaryResult, countResult, postsResult] = await Promise.all([
    query<{
      total_posts: string
      reactions: string
      comments: string
      shares: string
    }>(
      `
      SELECT
        COUNT(*)::text AS total_posts,
        COALESCE(SUM(reactions_count), 0)::text AS reactions,
        COALESCE(SUM(comments_count), 0)::text AS comments,
        COALESCE(SUM(shares_count), 0)::text AS shares
      FROM meta_post_metrics
      WHERE ${whereClause}
      `,
      params
    ),
    query<{ count: string }>(
      `
      SELECT COUNT(*)::text AS count
      FROM meta_post_metrics
      WHERE ${whereClause}
      `,
      params
    ),
    query<MetaPostMetricsRow>(
      `
      SELECT ${POST_SELECT}
      FROM meta_post_metrics
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
      `,
      [...params, filters.pageSize, offset]
    ),
  ])

  const totalItems = Number(countResult.rows[0]?.count ?? 0)
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize))
  const posts = postsResult.rows.map(mapPostMetricsRow)

  const totalReactions = Number(summaryResult.rows[0]?.reactions ?? 0)
  const totalComments = Number(summaryResult.rows[0]?.comments ?? 0)
  const totalShares = Number(summaryResult.rows[0]?.shares ?? 0)
  const totalEngagement = totalReactions + totalComments + totalShares
  const totalPosts = Number(summaryResult.rows[0]?.total_posts ?? 0)

  let highestPerformingPost: MetaBusinessPagePostRow | null = null
  if (totalPosts > 0) {
    const topResult = await query<MetaPostMetricsRow>(
      `
      SELECT ${POST_SELECT}
      FROM meta_post_metrics
      WHERE facebook_page_id = $1
      ORDER BY reactions_count + comments_count + shares_count DESC
      LIMIT 1
      `,
      [pageId]
    )
    highestPerformingPost = topResult.rows[0]
      ? mapPostMetricsRow(topResult.rows[0])
      : null
  }

  return {
    page,
    summary: {
      totalPosts,
      totalReactions,
      totalComments,
      totalShares,
      totalEngagement,
      averageEngagementPerPost:
        totalPosts > 0 ? Number((totalEngagement / totalPosts).toFixed(1)) : 0,
      highestPerformingPost,
    },
    posts,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages,
    },
    postsUnavailableMessage: page.postsUnavailableMessage ?? POSTS_PERMISSION_MESSAGE,
  }
}

export async function getMetaPostByPostId(
  pageKey: MetaPageConfigKey,
  postId: string
): Promise<MetaBusinessPagePostRow | null> {
  const config = getMetaPageByKey(pageKey)
  if (!config?.pageId) {
    return null
  }

  const result = await query<MetaPostMetricsRow>(
    `
    SELECT ${POST_SELECT}
    FROM meta_post_metrics
    WHERE facebook_page_id = $1 AND post_id = $2
    LIMIT 1
    `,
    [config.pageId, postId]
  )

  const row = result.rows[0]
  return row ? mapPostMetricsRow(row) : null
}

export async function getMetaPostByDbId(
  pageKey: MetaPageConfigKey,
  postDbId: number
): Promise<MetaBusinessPagePostRow | null> {
  const config = getMetaPageByKey(pageKey)
  if (!config?.pageId) {
    return null
  }

  const result = await query<MetaPostMetricsRow>(
    `
    SELECT ${POST_SELECT}
    FROM meta_post_metrics
    WHERE facebook_page_id = $1 AND id = $2
    LIMIT 1
    `,
    [config.pageId, postDbId]
  )

  const row = result.rows[0]
  return row ? mapPostMetricsRow(row) : null
}
