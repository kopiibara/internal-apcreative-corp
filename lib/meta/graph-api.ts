import "server-only"

import {
  getMetaGraphApiBaseUrl,
  resolveMetaPageAccessToken,
} from "@/lib/meta/config"
import type { MetaFacebookPageRow } from "@/lib/meta/types"

export type DiscoveredFacebookPage = {
  id: string
  name: string
  followers_count?: number
  fan_count?: number
  link?: string
}

export const PAGE_INSIGHT_METRICS = [
  "page_impressions",
  "page_impressions_unique",
  "page_engaged_users",
  "page_post_engagements",
  "page_views_total",
  "page_fan_adds",
] as const

export const POST_INSIGHT_METRICS = [
  "post_impressions",
  "post_engaged_users",
  "post_clicks",
] as const

type GraphApiError = {
  error?: {
    message?: string
    type?: string
    code?: number
  }
}

async function metaGraphFetch<T>(
  path: string,
  accessToken: string,
  searchParams?: Record<string, string>
) {
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

  const body = (await response.json()) as T & GraphApiError

  if (!response.ok || body.error) {
    throw new Error(
      body.error?.message ??
        `Meta Graph API request failed (${response.status})`
    )
  }

  return body
}

export async function discoverFacebookPagesFromToken(accessToken: string) {
  try {
    const me = await metaGraphFetch<DiscoveredFacebookPage>("/me", accessToken, {
      fields: "id,name,followers_count,fan_count,link",
    })

    if (me.id) {
      return [me]
    }
  } catch {
    // Fall through to managed accounts (user/system token).
  }

  const accounts = await metaGraphFetch<{ data: DiscoveredFacebookPage[] }>(
    "/me/accounts",
    accessToken,
    {
      fields: "id,name,followers_count,fan_count,link,access_token",
    }
  )

  return accounts.data ?? []
}

export async function fetchPageSummary(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">
) {
  const token = resolveMetaPageAccessToken(page.access_token_env_key)
  if (!token) {
    throw new Error("Meta Page access token is not configured.")
  }

  return metaGraphFetch<{
    id: string
    name?: string
    followers_count?: number
    fan_count?: number
    link?: string
  }>(`/${page.facebook_page_id}`, token, {
    fields: "id,name,followers_count,fan_count,link",
  })
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

function readPostReactionCount(post: GraphPost) {
  return (
    post.reactions?.summary?.total_count ??
    post.likes?.summary?.total_count ??
    0
  )
}

export async function fetchRecentPagePosts(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  limit = 50
) {
  const token = resolveMetaPageAccessToken(page.access_token_env_key)
  if (!token) {
    throw new Error("Meta Page access token is not configured.")
  }

  return metaGraphFetch<{ data: GraphPost[] }>(
    `/${page.facebook_page_id}/posts`,
    token,
    {
      fields:
        "id,message,created_time,permalink_url,full_picture,shares,likes.summary(true),comments.summary(true),reactions.summary(true)",
      limit: String(limit),
    }
  )
}

export { readPostReactionCount }

export async function fetchPageInsights(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  metricNames: readonly string[] = PAGE_INSIGHT_METRICS
) {
  const token = resolveMetaPageAccessToken(page.access_token_env_key)
  if (!token) {
    throw new Error("Meta Page access token is not configured.")
  }

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

export async function fetchPostInsights(
  postId: string,
  page: Pick<MetaFacebookPageRow, "access_token_env_key">
) {
  const token = resolveMetaPageAccessToken(page.access_token_env_key)
  if (!token) {
    throw new Error("Meta Page access token is not configured.")
  }

  return metaGraphFetch<{
    data: Array<{
      name: string
      period: string
      values: Array<{ value: number; end_time?: string }>
    }>
  }>(`/${postId}/insights`, token, {
    metric: POST_INSIGHT_METRICS.join(","),
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
  const denominator = input.followers && input.followers > 0 ? input.followers : 1
  return Number((interactions / denominator).toFixed(4))
}
