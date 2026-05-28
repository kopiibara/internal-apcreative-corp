import "server-only"

import { query } from "@/lib/db"
import { getMetaCronSecret } from "@/lib/meta/config"
import { getConfiguredMetaPages } from "@/lib/meta/pages-config"

export type MetaIntegrationStatus = {
  graphTokenConfigured: boolean
  cronConfigured: boolean
  enabledPageCount: number
  connectedPageCount: number
  snapshotCount: number
  postMetricsCount: number
  lastSyncAt: string | null
  lastSyncError: string | null
  needsBootstrap: boolean
}

export async function getMetaIntegrationStatus(): Promise<MetaIntegrationStatus> {
  const cronConfigured = Boolean(getMetaCronSecret())
  const configuredPages = getConfiguredMetaPages()
  const enabledPageCount = configuredPages.length
  const pageIds = configuredPages.map((page) => page.pageId)

  const [pages, snapshots, posts, lastSync] = await Promise.all([
    query<{ count: string }>(
      pageIds.length > 0
        ? `
    SELECT COUNT(*)::text AS count
    FROM meta_facebook_page
    WHERE is_active = true AND facebook_page_id = ANY($1::text[])
    `
        : `SELECT '0'::text AS count`,
      pageIds.length > 0 ? [pageIds] : []
    ),
    query<{ count: string }>(
      pageIds.length > 0
        ? `
    SELECT COUNT(*)::text AS count
    FROM meta_page_daily_snapshot
    WHERE facebook_page_id = ANY($1::text[])
    `
        : `SELECT '0'::text AS count`,
      pageIds.length > 0 ? [pageIds] : []
    ),
    query<{ count: string }>(
      pageIds.length > 0
        ? `
    SELECT COUNT(*)::text AS count
    FROM meta_post_metrics
    WHERE facebook_page_id = ANY($1::text[])
    `
        : `SELECT '0'::text AS count`,
      pageIds.length > 0 ? [pageIds] : []
    ),
    query<{ last_synced_at: Date | null; error_log: string | null }>(
      pageIds.length > 0
        ? `
      SELECT p.last_synced_at, r.error_log
      FROM meta_facebook_page p
      LEFT JOIN LATERAL (
        SELECT error_log
        FROM meta_sync_run
        WHERE facebook_page_id = p.facebook_page_id
          AND status = 'FAILED'
        ORDER BY started_at DESC
        LIMIT 1
      ) r ON true
      WHERE p.is_active = true
        AND p.facebook_page_id = ANY($1::text[])
      ORDER BY p.last_synced_at DESC NULLS LAST
      LIMIT 1
      `
        : `SELECT NULL::timestamptz AS last_synced_at, NULL::text AS error_log`,
      pageIds.length > 0 ? [pageIds] : []
    ),
  ])

  const connectedPageCount = Number(pages.rows[0]?.count ?? 0)
  const snapshotCount = Number(snapshots.rows[0]?.count ?? 0)
  const postMetricsCount = Number(posts.rows[0]?.count ?? 0)

  const needsBootstrap =
    enabledPageCount > 0 &&
    (connectedPageCount === 0 || (snapshotCount === 0 && postMetricsCount === 0))

  return {
    graphTokenConfigured: enabledPageCount > 0,
    cronConfigured,
    enabledPageCount,
    connectedPageCount,
    snapshotCount,
    postMetricsCount,
    lastSyncAt: lastSync.rows[0]?.last_synced_at
      ? new Date(lastSync.rows[0].last_synced_at).toISOString()
      : null,
    lastSyncError: lastSync.rows[0]?.error_log ?? null,
    needsBootstrap,
  }
}

export function getMetaEnvChecklist() {
  const pages = getConfiguredMetaPages()

  return {
    pages: pages.map((page) => ({
      key: page.key,
      name: page.name,
      enabled: page.enabled,
      pageIdConfigured: Boolean(page.pageId),
      tokenConfigured: Boolean(page.accessToken),
      ready: Boolean(page.pageId && page.accessToken),
    })),
  }
}
