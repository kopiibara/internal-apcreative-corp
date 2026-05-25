const PRODUCTION_APP_URL = "https://internal.apcreativecorp.com"
const LOCAL_APP_URL = "http://localhost:3000"

const DEFAULT_TRUSTED_ORIGINS = [LOCAL_APP_URL, PRODUCTION_APP_URL] as const

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "")
}

function parseCommaSeparatedOrigins(value: string | undefined) {
  if (!value?.trim()) {
    return []
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function getBetterAuthBaseUrl() {
  const configured = process.env.BETTER_AUTH_URL?.trim()

  if (configured) {
    return normalizeUrl(configured)
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_APP_URL
  }

  return LOCAL_APP_URL
}

export function getBetterAuthTrustedOrigins() {
  const origins = new Set<string>([
    ...DEFAULT_TRUSTED_ORIGINS,
    ...parseCommaSeparatedOrigins(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  ])

  const baseUrl = getBetterAuthBaseUrl()

  try {
    origins.add(new URL(baseUrl).origin)
  } catch {
    // Ignore invalid BETTER_AUTH_URL values; Better Auth will surface config errors.
  }

  return [...origins]
}

export function getBetterAuthSecret() {
  return process.env.BETTER_AUTH_SECRET
}
