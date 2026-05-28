import "server-only"

import {
  getActiveMetaPages,
  validateEnabledMetaPages,
} from "@/lib/meta/pages-config"

const META_GRAPH_API_VERSION = "v25.0"

export function getMetaWebhookVerifyToken() {
  return process.env.META_WEBHOOK_VERIFY_TOKEN ?? ""
}

export function getMetaAppId() {
  return process.env.META_APP_ID ?? ""
}

export function getMetaAppSecret() {
  return process.env.META_APP_SECRET ?? ""
}

export function getMetaCronSecret() {
  return process.env.META_CRON_SECRET ?? ""
}

export function getMetaGraphApiVersion() {
  return process.env.META_GRAPH_API_VERSION ?? META_GRAPH_API_VERSION
}

export function getMetaGraphApiBaseUrl() {
  return `https://graph.facebook.com/${getMetaGraphApiVersion()}`
}

/** @deprecated Use per-page tokens from `pages-config` (e.g. NEON_NIGHTS_META_PAGE_ACCESS_TOKEN). */
export function getDefaultMetaPageAccessToken() {
  const activePage = getActiveMetaPages().find(
    (page) => page.pageId && page.accessToken
  )
  if (activePage?.accessToken) {
    return activePage.accessToken
  }

  return process.env.META_PAGE_ACCESS_TOKEN ?? ""
}

/** Returns only the token from the given env var. Never falls back to legacy META_PAGE_ACCESS_TOKEN. */
export function resolveMetaPageAccessToken(envKey?: string | null) {
  if (!envKey) {
    return ""
  }
  return process.env[envKey]?.trim() ?? ""
}

export function isMetaWebhookConfigured() {
  return Boolean(getMetaWebhookVerifyToken() && getMetaAppSecret())
}

export function isMetaGraphApiConfigured() {
  return getActiveMetaPages().length > 0
}
