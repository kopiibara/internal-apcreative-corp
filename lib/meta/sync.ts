import "server-only"

import { query } from "@/lib/db"
import {
  calculateEngagementRate,
  fetchPageInsights,
  fetchPageSummary,
  fetchPostInsights,
  fetchRecentPagePosts,
  PAGE_INSIGHT_METRICS,
  parseInsightValues,
} from "@/lib/meta/graph-api"
import {
  getActiveMetaPagesForSync,
  type MetaSyncPage,
} from "@/lib/meta/pages-config"
import type { MetaFacebookPageRow, MetaSyncType } from "@/lib/meta/types"

async function startSyncRun(syncType: MetaSyncType, facebookPageId: string | null) {
  const result = await query<{ id: number }>(
    `
    INSERT INTO meta_sync_run (sync_type, facebook_page_id, status)
    VALUES ($1, $2, 'STARTED')
    RETURNING id
    `,
    [syncType, facebookPageId]
  )

  return result.rows[0]?.id
}

async function finishSyncRun(
  runId: number,
  status: "SUCCESS" | "FAILED",
  recordsAffected: number,
  errorLog?: string | null
) {
  await query(
    `
    UPDATE meta_sync_run
    SET
      status = $2,
      finished_at = now(),
      records_affected = $3,
      error_log = $4
    WHERE id = $1
    `,
    [runId, status, recordsAffected, errorLog ?? null]
  )
}

async function ensureEnvMetaPagesRegistered(pages: MetaSyncPage[]) {
  for (const page of pages) {
    await query(
      `
      INSERT INTO meta_facebook_page (
        facebook_page_id,
        page_name,
        access_token_env_key,
        webhook_subscribed_fields
      )
      VALUES ($1, $2, $3, ARRAY['feed']::TEXT[])
      ON CONFLICT (facebook_page_id)
      DO UPDATE SET
        page_name = EXCLUDED.page_name,
        access_token_env_key = EXCLUDED.access_token_env_key,
        is_active = true,
        updated_at = now()
      `,
      [page.facebook_page_id, page.page_name, page.access_token_env_key]
    )
  }
}

export async function listActiveMetaFacebookPages() {
  const envPages = getActiveMetaPagesForSync()
  await ensureEnvMetaPagesRegistered(envPages)

  const result = await query<MetaFacebookPageRow>(
    `
    SELECT
      id,
      facebook_page_id,
      page_name,
      brand_id,
      access_token_env_key,
      is_active,
      webhook_subscribed_fields,
      last_synced_at
    FROM meta_facebook_page
    WHERE is_active = true
      AND facebook_page_id = ANY($1::text[])
    ORDER BY page_name ASC
    `,
    [envPages.map((page) => page.facebook_page_id)]
  )

  if (result.rows.length > 0) {
    return result.rows
  }

  return envPages.map((page) => ({
    id: 0,
    facebook_page_id: page.facebook_page_id,
    page_name: page.page_name,
    brand_id: null,
    access_token_env_key: page.access_token_env_key,
    is_active: true,
    webhook_subscribed_fields: ["feed"],
    last_synced_at: null,
  }))
}

export async function syncDailyPageSnapshots() {
  const pages = await listActiveMetaFacebookPages()
  let affected = 0

  for (const page of pages) {
    const runId = await startSyncRun("daily_page", page.facebook_page_id)

    try {
      const summary = await fetchPageSummary(page)
      let insightsMetrics: Record<string, unknown> = {}

      try {
        const insights = await fetchPageInsights(page, PAGE_INSIGHT_METRICS)
        const parsed = parseInsightValues(insights.data ?? [])
        insightsMetrics = {
          insights: insights.data,
          parsed,
        }
      } catch {
        insightsMetrics = { insights: [] }
      }

      const snapshotDate = new Date().toISOString().slice(0, 10)

      await query(
        `
        INSERT INTO meta_page_daily_snapshot (
          facebook_page_id,
          snapshot_date,
          followers_count,
          page_likes,
          metrics
        )
        VALUES ($1, $2::date, $3, $4, $5::jsonb)
        ON CONFLICT (facebook_page_id, snapshot_date)
        DO UPDATE SET
          followers_count = EXCLUDED.followers_count,
          page_likes = EXCLUDED.page_likes,
          metrics = EXCLUDED.metrics
        `,
        [
          page.facebook_page_id,
          snapshotDate,
          summary.followers_count ?? null,
          summary.fan_count ?? null,
          JSON.stringify(insightsMetrics),
        ]
      )

      await query(
        `
        UPDATE meta_facebook_page
        SET
          page_name = COALESCE($2, page_name),
          last_synced_at = now(),
          updated_at = now()
        WHERE facebook_page_id = $1
        `,
        [page.facebook_page_id, summary.name ?? null]
      )

      if (runId) {
        await finishSyncRun(runId, "SUCCESS", 1)
      }

      affected += 1
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Daily page sync failed"
      if (runId) {
        await finishSyncRun(runId, "FAILED", 0, message)
      }
    }
  }

  return affected
}

export async function syncHourlyPostMetrics() {
  const pages = await listActiveMetaFacebookPages()
  let affected = 0

  for (const page of pages) {
    const runId = await startSyncRun("hourly_posts", page.facebook_page_id)

    try {
      const summary = await fetchPageSummary(page)
      const postsResponse = await fetchRecentPagePosts(page, 25)
      const posts = postsResponse.data ?? []

      for (const post of posts) {
        const reactions = post.reactions?.summary?.total_count ?? 0
        const comments = post.comments?.summary?.total_count ?? 0
        const shares = post.shares?.count ?? 0
        const engagementRate = calculateEngagementRate({
          reactions,
          comments,
          shares,
          followers: summary.followers_count ?? null,
        })

        let postInsights: Record<string, unknown> = {}

        try {
          const insightsResponse = await fetchPostInsights(post.id, page)
          postInsights = {
            raw: insightsResponse.data,
            parsed: parseInsightValues(insightsResponse.data ?? []),
          }
        } catch {
          postInsights = {}
        }

        await query(
          `
          INSERT INTO meta_post_metrics (
            facebook_page_id,
            post_id,
            message,
            permalink,
            published_at,
            reactions_count,
            comments_count,
            shares_count,
            engagement_rate,
            insights,
            last_synced_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5::timestamptz, $6, $7, $8, $9, $10::jsonb, now(), now())
          ON CONFLICT (facebook_page_id, post_id)
          DO UPDATE SET
            message = EXCLUDED.message,
            permalink = EXCLUDED.permalink,
            published_at = EXCLUDED.published_at,
            reactions_count = EXCLUDED.reactions_count,
            comments_count = EXCLUDED.comments_count,
            shares_count = EXCLUDED.shares_count,
            engagement_rate = EXCLUDED.engagement_rate,
            insights = EXCLUDED.insights,
            last_synced_at = now(),
            updated_at = now()
          `,
          [
            page.facebook_page_id,
            post.id,
            post.message ?? null,
            post.permalink_url ?? null,
            post.created_time ?? null,
            reactions,
            comments,
            shares,
            engagementRate,
            JSON.stringify(postInsights),
          ]
        )

        affected += 1
      }

      await query(
        `
        WITH ranked AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              ORDER BY
                reactions_count + comments_count + shares_count DESC,
                published_at DESC NULLS LAST
            ) AS rank
          FROM meta_post_metrics
          WHERE facebook_page_id = $1
        )
        UPDATE meta_post_metrics m
        SET performance_rank = ranked.rank
        FROM ranked
        WHERE m.id = ranked.id
        `,
        [page.facebook_page_id]
      )

      await query(
        `
        UPDATE meta_facebook_page
        SET last_synced_at = now(), updated_at = now()
        WHERE facebook_page_id = $1
        `,
        [page.facebook_page_id]
      )

      if (runId) {
        await finishSyncRun(runId, "SUCCESS", posts.length)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Hourly post sync failed"
      if (runId) {
        await finishSyncRun(runId, "FAILED", 0, message)
      }
    }
  }

  return affected
}

export async function runMetaSyncJob(syncType: MetaSyncType) {
  switch (syncType) {
    case "hourly_posts":
      return syncHourlyPostMetrics()
    case "daily_page":
      return syncDailyPageSnapshots()
    case "weekly_summary":
    case "monthly_summary":
      return syncDailyPageSnapshots()
    default:
      return 0
  }
}
