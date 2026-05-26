import "server-only"

import {
  getMetaGraphApiBaseUrl,
  resolveMetaPageAccessToken,
} from "@/lib/meta/config"
import { classifyMetaGraphError } from "@/lib/meta/graph-errors"
import type { MetaFacebookPageRow } from "@/lib/meta/types"

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

type GraphApiErrorBody = {
  error?: {
    message?: string
    type?: string
    code?: number
  }
}

export type MetaGraphFetchResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      error: string
      permissionDenied: boolean
      tokenExpired: boolean
    }

type GraphPost = {
  id: string
  message?: string
  permalink_url?: string
  created_time?: string
  full_picture?: string
  likes?: { summary?: { total_count?: number } }
  reactions?: { summary?: { total_count?: number } }
  comments?: { summary?: { total_count?: number } }
  shares?: { count?: number }
}

async function metaGraphFetch<T>(
  path: string,
  accessToken: string,
  searchParams?: Record<string, string>
): Promise<T> {
  const url = new URL(`${getMetaGraphApiBaseUrl()}${path}`)
  url.searchParams.set("access_token", accessToken)

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value)
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })

  const body = (await response.json()) as T & GraphApiErrorBody

  if (!response.ok || body.error) {
    throw new Error(
      body.error?.message ??
        `Meta Graph API request failed (${response.status})`
    )
  }

  return body
}

export async function metaGraphFetchSafe<T>(
  path: string,
  accessToken: string,
  searchParams?: Record<string, string>
): Promise<MetaGraphFetchResult<T>> {
  try {
    const data = await metaGraphFetch<T>(path, accessToken, searchParams)
    return { ok: true, data }
  } catch (error) {
    const info = classifyMetaGraphError(error)
    return {
      ok: false,
      error: info.message,
      permissionDenied: info.permissionDenied,
      tokenExpired: info.tokenExpired,
    }
  }
}

function resolvePageToken(
  page: Pick<MetaFacebookPageRow, "access_token_env_key">
) {
  const token = resolveMetaPageAccessToken(page.access_token_env_key)?.trim()
  if (!token) {
    throw new Error(
      "Meta Page access token is not configured. Set the page token env variable (e.g. NEON_NIGHTS_META_PAGE_ACCESS_TOKEN)."
    )
  }
  return token
}

export async function fetchPageSummary(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">
) {
  const token = resolvePageToken(page)

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
  const token = resolvePageToken(page)
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

const POST_LIST_FIELDS =
  "id,message,created_time,permalink_url,full_picture,shares,likes.summary(true),comments.summary(true)"

export async function fetchRecentPagePosts(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  limit = 50
) {
  const token = resolvePageToken(page)

  return metaGraphFetch<{ data: GraphPost[] }>(
    `/${page.facebook_page_id}/posts`,
    token,
    {
      fields: POST_LIST_FIELDS,
      limit: String(limit),
    }
  )
}

export async function fetchRecentPagePostsSafe(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  limit = 50
) {
  const token = resolvePageToken(page)
  return metaGraphFetchSafe<{ data: GraphPost[] }>(
    `/${page.facebook_page_id}/posts`,
    token,
    {
      fields: POST_LIST_FIELDS,
      limit: String(limit),
    }
  )
}

export { readPostReactionCount }

export async function fetchPageInsights(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  metricNames: readonly string[] = DAILY_PAGE_INSIGHT_METRICS
) {
  const token = resolvePageToken(page)

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
  const token = resolvePageToken(page)
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

export const POSTS_PERMISSION_MESSAGE =
  "Posts unavailable from current permission/token. Please regenerate the Page Access Token with pages_read_engagement and pages_read_user_content."
