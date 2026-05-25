import "server-only"

import { query } from "@/lib/db"
import { getDefaultMetaPageAccessToken } from "@/lib/meta/config"
import {
  discoverFacebookPagesFromToken,
  type DiscoveredFacebookPage,
} from "@/lib/meta/graph-api"
import { syncDailyPageSnapshots, syncHourlyPostMetrics } from "@/lib/meta/sync"

export type MetaBootstrapResult = {
  discoveredPages: DiscoveredFacebookPage[]
  registeredCount: number
  dailySnapshots: number
  postMetrics: number
  errors: string[]
}

export async function registerDiscoveredMetaPages(
  pages: DiscoveredFacebookPage[]
) {
  let registeredCount = 0

  for (const page of pages) {
    await query(
      `
      INSERT INTO meta_facebook_page (
        facebook_page_id,
        page_name,
        webhook_subscribed_fields
      )
      VALUES ($1, $2, ARRAY['feed']::TEXT[])
      ON CONFLICT (facebook_page_id)
      DO UPDATE SET
        page_name = EXCLUDED.page_name,
        is_active = true,
        updated_at = now()
      `,
      [page.id, page.name]
    )
    registeredCount += 1
  }

  return registeredCount
}

export async function bootstrapMetaMonitoring(): Promise<MetaBootstrapResult> {
  const token = getDefaultMetaPageAccessToken()
  const errors: string[] = []

  if (!token) {
    throw new Error(
      "META_PAGE_ACCESS_TOKEN is not set. Add a long-lived Page access token to your environment."
    )
  }

  let discoveredPages: DiscoveredFacebookPage[] = []

  try {
    discoveredPages = await discoverFacebookPagesFromToken(token)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to discover Facebook Pages."
    throw new Error(message)
  }

  if (discoveredPages.length === 0) {
    throw new Error(
      "No Facebook Pages found for this token. Use a Page access token with pages_show_list and read_insights."
    )
  }

  const registeredCount = await registerDiscoveredMetaPages(discoveredPages)

  let dailySnapshots = 0
  let postMetrics = 0

  try {
    dailySnapshots = await syncDailyPageSnapshots()
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "Daily page sync failed."
    )
  }

  try {
    postMetrics = await syncHourlyPostMetrics()
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "Hourly post sync failed."
    )
  }

  if (dailySnapshots === 0 && postMetrics === 0 && errors.length === 0) {
    errors.push(
      "Pages were registered but sync returned no records. Check token permissions (read_insights, pages_read_engagement)."
    )
  }

  return {
    discoveredPages,
    registeredCount,
    dailySnapshots,
    postMetrics,
    errors,
  }
}
