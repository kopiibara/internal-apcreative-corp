import "server-only"

export type MetaPageConfigKey = string

export type MetaPageConfig = {
  key: MetaPageConfigKey
  name: string
  displayName: string
  brandSlug: string
  enabled: boolean
  pageId: string
  accessToken: string
  pageIdEnvKey: string
  accessTokenEnvKey: string
}

function readEnv(name: string) {
  return process.env[name]?.trim() ?? ""
}

function normalizeBrandKey(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-")
}

type MetaFacebookPagesConfigEntry = {
  brandKey: string
  brandName: string
  pageId: string
  pageAccessToken: string
  enabled?: boolean
}

function titleCaseFromEnvPrefix(prefix: string) {
  return prefix
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function discoverFacebookPagesFromEnv(): MetaFacebookPagesConfigEntry[] {
  const envKeys = Object.keys(process.env)
  const pageIdKeys = envKeys.filter((key) => key.endsWith("_META_PAGE_ID"))

  const entries: MetaFacebookPagesConfigEntry[] = []

  for (const pageIdEnvKey of pageIdKeys) {
    const prefix = pageIdEnvKey.replace(/_META_PAGE_ID$/, "")
    const tokenEnvKey = `${prefix}_META_PAGE_ACCESS_TOKEN`
    const enabledEnvKey = `${prefix}_META_ENABLED`

    if (!envKeys.includes(tokenEnvKey)) {
      continue
    }

    entries.push({
      brandKey: normalizeBrandKey(prefix),
      brandName: titleCaseFromEnvPrefix(prefix),
      pageId: pageIdEnvKey,
      pageAccessToken: tokenEnvKey,
      enabled: process.env[enabledEnvKey] === "true",
    })
  }

  return entries
}

function readFacebookPagesConfig(): MetaFacebookPagesConfigEntry[] {
  const raw = process.env.META_FACEBOOK_PAGES_CONFIG?.trim()
  if (!raw) return discoverFacebookPagesFromEnv()

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return discoverFacebookPagesFromEnv()
    }
    return parsed as MetaFacebookPagesConfigEntry[]
  } catch {
    return discoverFacebookPagesFromEnv()
  }
}

function buildPageFromConfig(entry: MetaFacebookPagesConfigEntry): MetaPageConfig | null {
  if (!entry || typeof entry !== "object") return null
  if (typeof entry.brandKey !== "string" || typeof entry.brandName !== "string") {
    return null
  }
  if (typeof entry.pageId !== "string" || typeof entry.pageAccessToken !== "string") {
    return null
  }

  const key = normalizeBrandKey(entry.brandKey)
  if (!key) return null

  const pageIdEnvKey = entry.pageId.trim()
  const accessTokenEnvKey = entry.pageAccessToken.trim()

  if (!pageIdEnvKey || !accessTokenEnvKey) return null

  const inferredPrefix = pageIdEnvKey.replace(/_META_PAGE_ID$/, "")
  const enabledEnvKey = `${inferredPrefix}_META_ENABLED`
  const enabledFromEnv =
    typeof process.env[enabledEnvKey] === "string"
      ? process.env[enabledEnvKey] === "true"
      : null

  return {
    key,
    name: entry.brandName.trim() || key,
    displayName: entry.brandName.trim() || key,
    brandSlug: key,
    enabled:
      entry.enabled === false
        ? false
        : enabledFromEnv === null
          ? true
          : enabledFromEnv,
    pageId: readEnv(pageIdEnvKey),
    accessToken: readEnv(accessTokenEnvKey),
    pageIdEnvKey,
    accessTokenEnvKey,
  }
}

export const metaPages: MetaPageConfig[] = readFacebookPagesConfig()
  .map(buildPageFromConfig)
  .filter((page): page is MetaPageConfig => Boolean(page))

export function isMetaPageConfigured(page: MetaPageConfig) {
  return Boolean(page.enabled && page.pageId && page.accessToken)
}

/** Pages with both Page ID and Page Access Token in env (sync + display). */
export function getConfiguredMetaPages() {
  return metaPages.filter(isMetaPageConfigured)
}

/** Pages enabled via config/env (may be missing credentials). */
export function getEnabledMetaPages() {
  return metaPages.filter((page) => page.enabled)
}

export function getActiveMetaPages() {
  return getConfiguredMetaPages()
}

export type MetaPageValidationIssue = {
  pageKey: MetaPageConfigKey
  pageName: string
  message: string
}

export function validateMetaPageConfig(page: MetaPageConfig): MetaPageValidationIssue[] {
  const issues: MetaPageValidationIssue[] = []

  if (page.enabled && !page.pageId) {
    issues.push({
      pageKey: page.key,
      pageName: page.name,
      message: `${page.pageIdEnvKey} is required when META_FACEBOOK_PAGES_CONFIG enables ${page.displayName}`,
    })
  }

  if (page.enabled && !page.accessToken) {
    issues.push({
      pageKey: page.key,
      pageName: page.name,
      message: `${page.accessTokenEnvKey} is required when META_FACEBOOK_PAGES_CONFIG enables ${page.displayName}`,
    })
  }

  return issues
}

export function validateEnabledMetaPages() {
  const issues = metaPages.flatMap(validateMetaPageConfig)

  return {
    valid: issues.length === 0,
    issues,
  }
}

export function getMetaPageByKey(key: MetaPageConfigKey) {
  return metaPages.find((page) => page.key === key)
}

export function getMetaPageByFacebookPageId(pageId: string) {
  return metaPages.find((page) => page.pageId === pageId)
}

export type MetaSyncPage = {
  facebook_page_id: string
  page_name: string
  brand_slug: string
  access_token_env_key: string
  config_key: MetaPageConfigKey
}

export function getActiveMetaPagesForSync(): MetaSyncPage[] {
  const validation = validateEnabledMetaPages()
  if (!validation.valid) {
    const summary = validation.issues.map((issue) => issue.message).join("; ")
    throw new Error(`Meta page configuration is incomplete: ${summary}`)
  }

  const configured = getConfiguredMetaPages()
  if (configured.length === 0) {
    throw new Error(
      "No Facebook pages are configured. Set PAGE_ID and PAGE_ACCESS_TOKEN for at least one brand (e.g. NEON_NIGHTS_META_PAGE_ID and NEON_NIGHTS_META_PAGE_ACCESS_TOKEN)."
    )
  }

  return configured.map((page) => ({
    facebook_page_id: page.pageId,
    page_name: page.name,
    brand_slug: page.brandSlug,
    access_token_env_key: page.accessTokenEnvKey,
    config_key: page.key,
  }))
}
