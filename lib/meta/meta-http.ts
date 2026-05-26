import "server-only"

import { getMetaGraphApiBaseUrl } from "@/lib/meta/config"
import { classifyMetaGraphError } from "@/lib/meta/graph-errors"

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

export async function metaGraphFetch<T>(
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
