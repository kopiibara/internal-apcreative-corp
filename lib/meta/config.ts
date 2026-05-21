import "server-only"

const META_GRAPH_API_VERSION = "v22.0"

export function getMetaWebhookVerifyToken() {
  return process.env.META_WEBHOOK_VERIFY_TOKEN ?? ""
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

export function getDefaultMetaPageAccessToken() {
  return process.env.META_PAGE_ACCESS_TOKEN ?? ""
}

export function resolveMetaPageAccessToken(envKey?: string | null) {
  if (envKey) {
    const token = process.env[envKey]
    if (token) {
      return token
    }
  }

  return getDefaultMetaPageAccessToken()
}

export function isMetaWebhookConfigured() {
  return Boolean(getMetaWebhookVerifyToken() && getMetaAppSecret())
}

export function isMetaGraphApiConfigured() {
  return Boolean(getDefaultMetaPageAccessToken() || process.env.META_PAGE_ACCESS_TOKEN)
}
