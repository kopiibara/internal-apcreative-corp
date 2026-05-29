import "server-only"

import {
  chunkInsightUnixWindows,
  type InsightUnixWindow,
} from "@/lib/meta/date-range"
import {
  mergeInsightTimeSeries,
  parseInsightTimeSeries,
  type InsightTimeSeries,
} from "@/lib/meta/insights-aggregate"
import { metaGraphFetch, metaGraphFetchSafe } from "@/lib/meta/meta-http"
import { resolveEffectivePageAccessToken } from "@/lib/meta/page-token"
import type { MetaFacebookPageRow } from "@/lib/meta/types"

export type { MetaGraphFetchResult } from "@/lib/meta/meta-http"

export type DiscoveredFacebookPage = {
  id: string
  name: string
  followers_count?: number
  fan_count?: number
  link?: string
  access_token?: string
}

/** Primary daily insights requested by product spec. */
export const DAILY_PAGE_INSIGHT_METRICS = [
  "page_impressions",
  "page_impressions_unique",
  "page_post_engagements",
  "page_views_total",
  "page_fan_adds",
  "page_daily_follows",
  "page_total_actions",
] as const

/** Extra insights fetched when read_insights allows. */
export const EXTENDED_PAGE_INSIGHT_METRICS = [
  "page_engaged_users",
  "page_fans",
  "page_follows",
] as const

export const REACTION_PAGE_INSIGHT_METRICS = [
  "page_actions_post_reactions_total",
] as const

export const REACTION_PAGE_INSIGHT_FALLBACK_METRICS = [
  "page_actions_post_reactions_like_total",
  "page_actions_post_reactions_love_total",
  "page_actions_post_reactions_wow_total",
  "page_actions_post_reactions_haha_total",
  "page_actions_post_reactions_sorry_total",
  "page_actions_post_reactions_anger_total",
] as const

export const PAGE_INSIGHT_METRICS = [
  ...DAILY_PAGE_INSIGHT_METRICS,
  ...EXTENDED_PAGE_INSIGHT_METRICS,
] as const

type GraphPost = {
  id: string
  message?: string
  permalink_url?: string
  created_time?: string
  full_picture?: string
  type?: string
  likes?: { summary?: { total_count?: number } }
  reactions?: { summary?: { total_count?: number } }
  comments?: { summary?: { total_count?: number } }
  shares?: { count?: number }
}

export type GraphPostComment = {
  id: string
  message?: string
  created_time?: string
  like_count?: number
  comment_count?: number
  permalink_url?: string
  from?: { id?: string; name?: string }
}

async function getPageToken(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">
) {
  const resolved = await resolveEffectivePageAccessToken({
    facebookPageId: page.facebook_page_id,
    accessTokenEnvKey: page.access_token_env_key,
  })
  return resolved.token
}

export async function fetchPageSummary(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">
) {
  const token = await getPageToken(page)

  return metaGraphFetch<{
    id: string
    name?: string
    followers_count?: number
    fan_count?: number
    link?: string
    picture?: { data?: { url?: string } }
  }>(`/${page.facebook_page_id}`, token, {
    fields: "id,name,link,fan_count,followers_count,picture{url}",
  })
}

export async function fetchPageSummarySafe(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">
) {
  const token = await getPageToken(page)
  return metaGraphFetchSafe<{
    id: string
    name?: string
    followers_count?: number
    fan_count?: number
    link?: string
    picture?: { data?: { url?: string } }
  }>(`/${page.facebook_page_id}`, token, {
    fields: "id,name,link,fan_count,followers_count,picture{url}",
  })
}

function readPostReactionCount(post: GraphPost) {
  return (
    post.reactions?.summary?.total_count ??
    post.likes?.summary?.total_count ??
    0
  )
}

/** Matches Graph API Explorer: summary counts without loading comment/reaction objects. */
export const META_POSTS_FETCH_LIMIT = 10

const POST_FIELDS_ENGAGEMENT =
  "id,message,created_time,permalink_url,full_picture,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)"

const POST_FIELDS_BASIC =
  "id,message,created_time,permalink_url,full_picture,shares"

const POST_COMMENT_FIELDS =
  "id,message,created_time,like_count,comment_count,permalink_url,from{name}"

async function fetchPostsWithFields(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  fields: string,
  limit: number,
  token: string
) {
  return metaGraphFetchSafe<{ data: GraphPost[] }>(
    `/${page.facebook_page_id}/posts`,
    token,
    {
      fields,
      limit: String(limit),
    }
  )
}

export async function fetchRecentPagePostsSafe(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  limit = META_POSTS_FETCH_LIMIT
) {
  const token = await getPageToken(page)

  const withEngagement = await fetchPostsWithFields(
    page,
    POST_FIELDS_ENGAGEMENT,
    limit,
    token
  )

  if (withEngagement.ok) {
    return withEngagement
  }

  if (withEngagement.permissionDenied) {
    const basic = await fetchPostsWithFields(
      page,
      POST_FIELDS_BASIC,
      limit,
      token
    )
    if (basic.ok) {
      return basic
    }
  }

  return withEngagement
}

export async function fetchRecentPagePosts(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  limit = META_POSTS_FETCH_LIMIT
) {
  const result = await fetchRecentPagePostsSafe(page, limit)
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}

export { readPostReactionCount }

type PageInsightsPayload = {
  data: Array<{
    name: string
    title?: string
    description?: string
    period: string
    values: Array<{ value: number | Record<string, number>; end_time?: string }>
  }>
}

export async function fetchPageInsights(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  metricNames: readonly string[] = DAILY_PAGE_INSIGHT_METRICS,
  window?: InsightUnixWindow
) {
  const token = await getPageToken(page)

  const params: Record<string, string> = {
    metric: metricNames.join(","),
    period: "day",
  }

  if (window) {
    params.since = String(window.since)
    params.until = String(window.until)
  }

  return metaGraphFetch<PageInsightsPayload>(
    `/${page.facebook_page_id}/insights`,
    token,
    params
  )
}

export async function fetchPageInsightsSafe(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  metricNames: readonly string[] = DAILY_PAGE_INSIGHT_METRICS,
  window?: InsightUnixWindow
) {
  const token = await getPageToken(page)

  const params: Record<string, string> = {
    metric: metricNames.join(","),
    period: "day",
  }

  if (window) {
    params.since = String(window.since)
    params.until = String(window.until)
  }

  return metaGraphFetchSafe<PageInsightsPayload>(
    `/${page.facebook_page_id}/insights`,
    token,
    params
  )
}

export async function fetchPageInsightsRangeSafe(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  metricNames: readonly string[],
  sinceDate: Date,
  untilDate: Date
): Promise<{
  ok: boolean
  series: InsightTimeSeries
  permissionDenied: boolean
  error?: string
}> {
  const windows = chunkInsightUnixWindows(sinceDate, untilDate)
  let series: InsightTimeSeries = {}
  let permissionDenied = false
  let lastError: string | undefined

  for (const window of windows) {
    const result = await fetchPageInsightsSafe(page, metricNames, window)
    if (!result.ok) {
      permissionDenied = permissionDenied || result.permissionDenied
      lastError = result.error
      if (result.permissionDenied) {
        break
      }
      continue
    }

    series = mergeInsightTimeSeries(
      series,
      parseInsightTimeSeries(result.data.data ?? [])
    )
  }

  const hasData = Object.keys(series).length > 0
  if (hasData) {
    return { ok: true, series, permissionDenied: false }
  }

  return {
    ok: false,
    series,
    permissionDenied,
    error: lastError ?? "Insights unavailable",
  }
}

export async function fetchPostLinkClicksSafe(
  postId: string,
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">
) {
  const token = await getPageToken(page)
  return metaGraphFetchSafe<{
    data: Array<{
      name: string
      values: Array<{ value: number | Record<string, number> }>
    }>
  }>(`/${postId}/insights`, token, {
    metric: "post_clicks,post_clicks_by_type",
    period: "lifetime",
  })
}

export function parseInsightValues(
  insights: Array<{
    name: string
    values: Array<{ value: number | Record<string, number> }>
  }>
) {
  const result: Record<string, number> = {}

  for (const metric of insights) {
    const latest = metric.values[metric.values.length - 1]
    const value = latest?.value

    if (typeof value === "number") {
      result[metric.name] = value
    }
  }

  return result
}

export function calculateEngagementRate(input: {
  reactions: number
  comments: number
  shares: number
  followers: number | null
}) {
  const interactions = input.reactions + input.comments + input.shares
  const denominator =
    input.followers && input.followers > 0 ? input.followers : 1
  return Number((interactions / denominator).toFixed(4))
}

export async function fetchPostCommentsSafe(
  postId: string,
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  limit = 50
) {
  const token = await getPageToken(page)
  return metaGraphFetchSafe<{ data: GraphPostComment[] }>(
    `/${postId}/comments`,
    token,
    {
      fields: POST_COMMENT_FIELDS,
      limit: String(limit),
      order: "reverse_chronological",
    }
  )
}

export const POSTS_PERMISSION_MESSAGE =
  "Posts unavailable from current permission/token. Use a Page access token (from /me/accounts) with pages_read_engagement and pages_read_user_content for this Page ID."
