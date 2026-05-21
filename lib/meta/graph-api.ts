import "server-only"

import {
  getMetaGraphApiBaseUrl,
  resolveMetaPageAccessToken,
} from "@/lib/meta/config"
import type { MetaFacebookPageRow } from "@/lib/meta/types"

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
  reactions?: { summary?: { total_count?: number } }
  comments?: { summary?: { total_count?: number } }
  shares?: { count?: number }
}

export async function fetchRecentPagePosts(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  limit = 25
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
        "id,message,permalink_url,created_time,reactions.summary(true),comments.summary(true),shares",
      limit: String(limit),
    }
  )
}

export async function fetchPageInsights(
  page: Pick<MetaFacebookPageRow, "facebook_page_id" | "access_token_env_key">,
  metricNames: string[]
) {
  const token = resolveMetaPageAccessToken(page.access_token_env_key)
  if (!token) {
    throw new Error("Meta Page access token is not configured.")
  }

  return metaGraphFetch<{
    data: Array<{
      name: string
      period: string
      values: Array<{ value: number | Record<string, number>; end_time?: string }>
    }>
  }>(`/${page.facebook_page_id}/insights`, token, {
    metric: metricNames.join(","),
    period: "day",
  })
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
