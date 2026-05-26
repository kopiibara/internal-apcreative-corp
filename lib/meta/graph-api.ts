import "server-only"

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
  "page_post_engagements",
  "page_fans",
  "page_follows",
] as const

/** Extra insights fetched when read_insights allows. */
export const EXTENDED_PAGE_INSIGHT_METRICS = [
  "page_impressions_unique",
  "page_views_total",
  "page_engaged_users",
  "page_fan_adds",
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
  }>(`/${page.facebook_page_id}`, token, {
    fields: "id,name,fan_count,followers_count",
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
  }>(`/${page.facebook_page_id}`, token, {
    fields: "id,name,fan_count,followers_count",
  })
}

function readPostReactionCount(post: GraphPost) {
  return (
    post.likes?.summary?.total_count ??
    post.reactions?.summary?.total_count ??
    0
  )
}

const POST_FIELDS_ENGAGEMENT =
  "id,message,created_time,permalink_url,full_picture,type,shares,likes.summary(true),comments.summary(true)"

const POST_FIELDS_BASIC =
  "id,message,created_time,permalink_url,full_picture,type,shares"

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
  limit = 50
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
  limit = 50
) {
  const result = await fetchRecentPagePostsSafe(page, limit)
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}

export { readPostReactionCount }

export async function fetchPageInsights(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  metricNames: readonly string[] = DAILY_PAGE_INSIGHT_METRICS
) {
  const token = await getPageToken(page)

  return metaGraphFetch<{
    data: Array<{
      name: string
      title?: string
      description?: string
      period: string
      values: Array<{ value: number | Record<string, number>; end_time?: string }>
    }>
  }>(`/${page.facebook_page_id}/insights`, token, {
    metric: metricNames.join(","),
    period: "day",
  })
}

export async function fetchPageInsightsSafe(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  metricNames: readonly string[] = DAILY_PAGE_INSIGHT_METRICS
) {
  const token = await getPageToken(page)
  return metaGraphFetchSafe<{
    data: Array<{
      name: string
      title?: string
      description?: string
      period: string
      values: Array<{ value: number | Record<string, number>; end_time?: string }>
    }>
  }>(`/${page.facebook_page_id}/insights`, token, {
    metric: metricNames.join(","),
    period: "day",
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
  "Posts unavailable from current permission/token. Use a Neon Nights Page access token (from /me/accounts) with pages_read_engagement and pages_read_user_content, or paste a User token that has pages_show_list so we can resolve the Page token automatically."
