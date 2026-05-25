import "server-only"

import { query } from "@/lib/db"
import {
  getMetaAppSecret,
  getMetaCronSecret,
  getMetaWebhookVerifyToken,
  getDefaultMetaPageAccessToken,
  isMetaWebhookConfigured,
} from "@/lib/meta/config"

export type MetaIntegrationStatus = {
  webhookConfigured: boolean
  graphTokenConfigured: boolean
  cronConfigured: boolean
  connectedPageCount: number
  webhookEventCount: number
  snapshotCount: number
  postMetricsCount: number
  lastSyncAt: string | null
  lastSyncError: string | null
  needsBootstrap: boolean
}

export async function getMetaIntegrationStatus(): Promise<MetaIntegrationStatus> {
  const webhookConfigured = isMetaWebhookConfigured()
  const graphTokenConfigured = Boolean(getDefaultMetaPageAccessToken())
  const cronConfigured = Boolean(getMetaCronSecret())

  const [pages, events, snapshots, posts, lastSync] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM meta_facebook_page WHERE is_active = true`
    ),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM meta_webhook_event`),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM meta_page_daily_snapshot`
    ),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM meta_post_metrics`),
    query<{ last_synced_at: Date | null; error_log: string | null }>(
      `
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
      ORDER BY p.last_synced_at DESC NULLS LAST
      LIMIT 1
      `
    ),
  ])

  const connectedPageCount = Number(pages.rows[0]?.count ?? 0)
  const snapshotCount = Number(snapshots.rows[0]?.count ?? 0)
  const postMetricsCount = Number(posts.rows[0]?.count ?? 0)

  const needsBootstrap =
    graphTokenConfigured &&
    (connectedPageCount === 0 || (snapshotCount === 0 && postMetricsCount === 0))

  return {
    webhookConfigured:
      webhookConfigured && Boolean(getMetaWebhookVerifyToken()),
    graphTokenConfigured,
    cronConfigured,
    connectedPageCount,
    webhookEventCount: Number(events.rows[0]?.count ?? 0),
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
  return {
    verifyToken: Boolean(getMetaWebhookVerifyToken()),
    appSecret: Boolean(getMetaAppSecret()),
    pageToken: Boolean(getDefaultMetaPageAccessToken()),
    cronSecret: Boolean(getMetaCronSecret()),
  }
}
