import "server-only"

export type MetaPageConfigKey = "neon-nights" | "pro-group" | "al-qaysar"

export type MetaPageConfig = {
  key: MetaPageConfigKey
  name: string
  displayName: string
  brandSlug: string
  enabled: boolean
  pageId: string
  accessToken: string
  enabledEnvKey: string
  pageIdEnvKey: string
  accessTokenEnvKey: string
}

function readEnv(name: string) {
  return process.env[name]?.trim() ?? ""
}

function readEnvFlag(name: string) {
  return process.env[name] === "true"
}

const metaPagesDefinition = [
  {
    key: "neon-nights" as const,
    name: "Neon Nights",
    displayName: "Neon Nights Bar Club",
    brandSlug: "neon-nights",
    enabledEnvKey: "NEON_NIGHTS_META_ENABLED",
    pageIdEnvKey: "NEON_NIGHTS_META_PAGE_ID",
    accessTokenEnvKey: "NEON_NIGHTS_META_PAGE_ACCESS_TOKEN",
  },
  {
    key: "pro-group" as const,
    name: "Pro Group",
    displayName: "Pro Group",
    brandSlug: "pro-group",
    enabledEnvKey: "PRO_GROUP_META_ENABLED",
    pageIdEnvKey: "PRO_GROUP_META_PAGE_ID",
    accessTokenEnvKey: "PRO_GROUP_META_PAGE_ACCESS_TOKEN",
  },
  {
    key: "al-qaysar" as const,
    name: "Al Qaysar",
    displayName: "Al Qaysar Restaurant and Cafe",
    brandSlug: "al-qaysar",
    enabledEnvKey: "AL_QAYSAR_META_ENABLED",
    pageIdEnvKey: "AL_QAYSAR_META_PAGE_ID",
    accessTokenEnvKey: "AL_QAYSAR_META_PAGE_ACCESS_TOKEN",
  },
] as const

function buildMetaPageConfig(
  definition: (typeof metaPagesDefinition)[number]
): MetaPageConfig {
  return {
    key: definition.key,
    name: definition.name,
    displayName: definition.displayName,
    brandSlug: definition.brandSlug,
    enabled: readEnvFlag(definition.enabledEnvKey),
    pageId: readEnv(definition.pageIdEnvKey),
    accessToken: readEnv(definition.accessTokenEnvKey),
    enabledEnvKey: definition.enabledEnvKey,
    pageIdEnvKey: definition.pageIdEnvKey,
    accessTokenEnvKey: definition.accessTokenEnvKey,
  }
}

export const metaPages: MetaPageConfig[] = metaPagesDefinition.map(buildMetaPageConfig)

export function isMetaPageConfigured(page: MetaPageConfig) {
  return Boolean(page.pageId && page.accessToken)
}

/** Pages with both Page ID and Page Access Token in env (sync + display). */
export function getConfiguredMetaPages() {
  return metaPages.filter(isMetaPageConfigured)
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
  if (!page.enabled) {
    return []
  }

  const issues: MetaPageValidationIssue[] = []

  if (!page.pageId) {
    issues.push({
      pageKey: page.key,
      pageName: page.name,
      message: `${page.pageIdEnvKey} is required when ${page.enabledEnvKey}=true`,
    })
  }

  if (!page.accessToken) {
    issues.push({
      pageKey: page.key,
      pageName: page.name,
      message: `${page.accessTokenEnvKey} is required when ${page.enabledEnvKey}=true`,
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
