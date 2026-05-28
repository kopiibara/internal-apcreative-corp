import "server-only"

import { query } from "@/lib/db"
import {
  getActiveMetaPages,
  getActiveMetaPagesForSync,
  validateEnabledMetaPages,
} from "@/lib/meta/pages-config"
import { fetchPageSummarySafe } from "@/lib/meta/graph-api"
import { clearMetaPageTokenCache } from "@/lib/meta/page-token"
import { runAllMetaSyncJobs } from "@/lib/meta/sync"

export type MetaBootstrapResult = {
  registeredPages: Array<{ id: string; name: string }>
  registeredCount: number
  dailySnapshots: number
  postMetrics: number
  errors: string[]
}

export async function registerConfiguredMetaPages() {
  const pages = getActiveMetaPagesForSync()
  let registeredCount = 0

  for (const page of pages) {
    const brand = await query<{ id: number }>(
      `SELECT id FROM brand WHERE slug = $1 LIMIT 1`,
      [page.brand_slug]
    )

    await query(
      `
      INSERT INTO meta_facebook_page (
        facebook_page_id,
        page_name,
        brand_id,
        access_token_env_key,
        webhook_subscribed_fields
      )
      VALUES ($1, $2, $3, $4, ARRAY['feed']::TEXT[])
      ON CONFLICT (facebook_page_id)
      DO UPDATE SET
        page_name = EXCLUDED.page_name,
        brand_id = EXCLUDED.brand_id,
        access_token_env_key = EXCLUDED.access_token_env_key,
        is_active = true,
        updated_at = now()
      `,
      [
        page.facebook_page_id,
        page.page_name,
        brand.rows[0]?.id ?? null,
        page.access_token_env_key,
      ]
    )
    registeredCount += 1
  }

  return registeredCount
}

export async function bootstrapMetaMonitoring(): Promise<MetaBootstrapResult> {
  const validation = validateEnabledMetaPages()
  const errors: string[] = []

  if (!validation.valid) {
    throw new Error(
      validation.issues.map((issue) => issue.message).join(" ")
    )
  }

  const activePages = getActiveMetaPages()
  if (activePages.length === 0) {
    throw new Error(
      "No Meta pages are enabled. Set NEON_NIGHTS_META_ENABLED=true and configure its Page ID and access token."
    )
  }

  const registeredPages: Array<{ id: string; name: string }> = []

  clearMetaPageTokenCache()

  for (const page of activePages) {
    try {
      const summaryResult = await fetchPageSummarySafe({
        facebook_page_id: page.pageId,
        access_token_env_key: page.accessTokenEnvKey,
      })

      if (!summaryResult.ok) {
        throw new Error(summaryResult.error)
      }

      const summary = summaryResult.data
      registeredPages.push({
        id: summary.id,
        name: summary.name ?? page.name,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to verify Meta page for ${page.name}.`
      errors.push(message)
    }
  }

  if (registeredPages.length === 0) {
    throw new Error(
      errors.join(" ") ||
        "No enabled Meta pages could be verified. Check Page ID and access token values."
    )
  }

  const registeredCount = await registerConfiguredMetaPages()

  let dailySnapshots = 0
  let postMetrics = 0
  let dailyInsights = 0

  try {
    const syncResult = await runAllMetaSyncJobs()
    dailySnapshots = syncResult.dailyPage
    postMetrics = syncResult.hourlyPosts
    dailyInsights = syncResult.dailyInsights
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "Meta sync failed."
    )
  }

  if (
    dailySnapshots === 0 &&
    postMetrics === 0 &&
    dailyInsights === 0 &&
    errors.length === 0
  ) {
    errors.push(
      "Pages were registered but sync returned no records. Check token permissions (read_insights, pages_read_engagement)."
    )
  }

  return {
    registeredPages,
    registeredCount,
    dailySnapshots,
    postMetrics,
    errors,
  }
}
