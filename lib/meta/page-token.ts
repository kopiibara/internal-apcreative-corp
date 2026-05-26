import "server-only"

import { resolveMetaPageAccessToken } from "@/lib/meta/config"
import { metaGraphFetchSafe } from "@/lib/meta/meta-http"

export type ResolvedPageTokenSource =
  | "env_page_token"
  | "env_user_token_resolved"
  | "env_fallback"

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

/**
 * Returns a Page access token suitable for /{page-id}/posts and /insights.
 * If the env value is a User token, resolves the matching Page token via /me/accounts.
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
      "Meta Page access token is not configured. Set NEON_NIGHTS_META_PAGE_ACCESS_TOKEN to a Page access token (or a User token with pages_show_list)."
    )
  }

  const me = await metaGraphFetchSafe<{ id: string }>("/me", configured, {
    fields: "id",
  })

  if (me.ok && me.data.id === input.facebookPageId) {
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
    fields: "id,name,access_token,tasks",
  })

  if (accounts.ok) {
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
  }

  const resolved: ResolvedPageToken = {
    token: configured,
    source: "env_fallback",
  }
  tokenCache.set(key, resolved)
  return resolved
}
