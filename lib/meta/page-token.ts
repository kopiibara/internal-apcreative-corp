import "server-only"

import { resolveMetaPageAccessToken } from "@/lib/meta/config"
import { classifyMetaGraphError } from "@/lib/meta/graph-errors"
import { metaGraphFetchSafe } from "@/lib/meta/meta-http"

export type ResolvedPageTokenSource = "env_page_token" | "env_user_token_resolved"

export type ResolvedPageToken = {
  token: string
  source: ResolvedPageTokenSource
}

const tokenCache = new Map<string, ResolvedPageToken>()

function cacheKey(facebookPageId: string, accessTokenEnvKey: string | null) {
  return `${accessTokenEnvKey ?? "default"}:${facebookPageId}`
}

export function clearMetaPageTokenCache() {
  tokenCache.clear()
}

function throwTokenResolutionError(message: string): never {
  const info = classifyMetaGraphError(new Error(message))
  if (info.applicationDeleted) {
    throw new Error(
      "Meta application has been deleted. Update the Page Access Token in environment variables with a token from your current Meta app."
    )
  }
  if (info.tokenExpired) {
    throw new Error(
      "Meta Page access token has expired. Generate a new Page access token and update the environment variable."
    )
  }
  if (info.tokenInvalid) {
    throw new Error(
      "Meta Page access token is invalid. Use a Page access token from /me/accounts for this Page ID."
    )
  }
  throw new Error(message)
}

/**
 * Resolves a Page access token for Graph API calls.
 * Prefers a direct Page token from env; otherwise resolves via /me/accounts (pages_show_list).
 */
export async function resolveEffectivePageAccessToken(input: {
  facebookPageId: string
  accessTokenEnvKey: string | null
}): Promise<ResolvedPageToken> {
  const key = cacheKey(input.facebookPageId, input.accessTokenEnvKey)
  const cached = tokenCache.get(key)
  if (cached) {
    return cached
  }

  const configured = resolveMetaPageAccessToken(input.accessTokenEnvKey)?.trim()
  if (!configured) {
    throw new Error(
      `Meta Page access token is not configured. Set ${input.accessTokenEnvKey ?? "the page access token env var"} to a Page access token from /me/accounts.`
    )
  }

  const me = await metaGraphFetchSafe<{ id: string }>("/me", configured, {
    fields: "id",
  })

  if (!me.ok) {
    throwTokenResolutionError(me.error)
  }

  if (me.data.id === input.facebookPageId) {
    const resolved: ResolvedPageToken = {
      token: configured,
      source: "env_page_token",
    }
    tokenCache.set(key, resolved)
    return resolved
  }

  const accounts = await metaGraphFetchSafe<{
    data: Array<{ id: string; name?: string; access_token?: string }>
  }>("/me/accounts", configured, {
    fields: "id,name,access_token",
  })

  if (!accounts.ok) {
    throwTokenResolutionError(accounts.error)
  }

  const match = accounts.data.data?.find(
    (account) => account.id === input.facebookPageId
  )

  if (match?.access_token) {
    const resolved: ResolvedPageToken = {
      token: match.access_token,
      source: "env_user_token_resolved",
    }
    tokenCache.set(key, resolved)
    return resolved
  }

  throw new Error(
    `Meta access token does not have access to Facebook Page ${input.facebookPageId}. ` +
      `Use a Page access token from /me/accounts for this Page, or verify AL_QAYSAR_META_PAGE_ID / NEON_NIGHTS_META_PAGE_ID.`
  )
}
