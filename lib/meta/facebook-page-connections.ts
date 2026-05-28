import "server-only"

import type { MetaPageConfig, MetaPageConfigKey } from "@/lib/meta/pages-config"
import { metaPages } from "@/lib/meta/pages-config"

export type FacebookPageConnection = {
  brandKey: MetaPageConfigKey
  brandName: string
  brandSlug: string
  pageId: string
  pageAccessToken: string
  platform: "facebook"
  enabled: boolean
  pageIdEnvKey: string
  accessTokenEnvKey: string
}

export function isFacebookPageConnectionReady(page: MetaPageConfig) {
  return Boolean(page.pageId.trim() && page.accessToken.trim())
}

/** All env-defined Facebook pages with both Page ID and Page Access Token set. */
export function getFacebookPageConnections(): FacebookPageConnection[] {
  return metaPages
    .filter(isFacebookPageConnectionReady)
    .map((page) => ({
      brandKey: page.key,
      brandName: page.displayName,
      brandSlug: page.brandSlug,
      pageId: page.pageId,
      pageAccessToken: page.accessToken,
      platform: "facebook" as const,
      enabled: page.enabled,
      pageIdEnvKey: page.pageIdEnvKey,
      accessTokenEnvKey: page.accessTokenEnvKey,
    }))
}

/** Pages shown on Platform Analytics (Neon Nights + Al Qaysar when configured). */
export function getFacebookPageConnectionsForDisplay(): FacebookPageConnection[] {
  return getFacebookPageConnections().filter((page) => page.brandKey !== "pro-group")
}

export function getFacebookPageConnectionByKey(brandKey: MetaPageConfigKey) {
  return getFacebookPageConnections().find((page) => page.brandKey === brandKey)
}
