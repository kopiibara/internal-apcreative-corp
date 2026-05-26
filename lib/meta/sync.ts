import "server-only"

import { query } from "@/lib/db"
import { resolveMetaAnalyticsWindow } from "@/lib/meta/date-range"
import {
  mergeInsightTimeSeries,
  type InsightTimeSeries,
} from "@/lib/meta/insights-aggregate"
import {
  calculateEngagementRate,
  fetchPageInsightsRangeSafe,
  fetchPageSummarySafe,
  fetchPostLinkClicksSafe,
  fetchRecentPagePostsSafe,
  readPostReactionCount,
} from "@/lib/meta/graph-api"
import { isMetaPermissionError } from "@/lib/meta/graph-errors"
import {
  getActiveMetaPagesForSync,
  type MetaSyncPage,
} from "@/lib/meta/pages-config"
import { clearMetaPageTokenCache } from "@/lib/meta/page-token"
import { logMetaSyncEvent } from "@/lib/meta/sync-logger"
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

async function getLatestFollowersForPage(facebookPageId: string) {
  const result = await query<{ followers_count: number | null }>(
    `
    SELECT followers_count
    FROM meta_page_daily_snapshot
    WHERE facebook_page_id = $1
    ORDER BY snapshot_date DESC
    LIMIT 1
    `,
    [facebookPageId]
  )

  return result.rows[0]?.followers_count ?? null
}

async function mergeSnapshotMetrics(
  facebookPageId: string,
  snapshotDate: string,
  patch: Record<string, unknown>
) {
  const existing = await query<{ metrics: Record<string, unknown> }>(
    `
    SELECT metrics
    FROM meta_page_daily_snapshot
    WHERE facebook_page_id = $1 AND snapshot_date = $2::date
    `,
    [facebookPageId, snapshotDate]
  )

  const merged = {
    ...(existing.rows[0]?.metrics ?? {}),
    ...patch,
  }

  return merged
}

/** Page name, likes, followers — no posts or insights. */
export async function syncDailyPageSnapshots() {
  clearMetaPageTokenCache()
  const pages = await listActiveMetaFacebookPages()
  let affected = 0

  for (const page of pages) {
    const runId = await startSyncRun("daily_page", page.facebook_page_id)

    try {
      const summaryResult = await fetchPageSummarySafe(page)

      if (!summaryResult.ok) {
        logMetaSyncEvent({
          source: "page_summary",
          facebookPageId: page.facebook_page_id,
          brandId: page.brand_id,
          status: "failed",
          errorMessage: summaryResult.error,
        })
        throw new Error(summaryResult.error)
      }

      const summary = summaryResult.data
      const snapshotDate = new Date().toISOString().slice(0, 10)

      logMetaSyncEvent({
        source: "page_summary",
        facebookPageId: page.facebook_page_id,
        brandId: page.brand_id,
        status: "success",
        recordsAffected: 1,
      })

      const metrics = await mergeSnapshotMetrics(page.facebook_page_id, snapshotDate, {
        daily_page_synced_at: new Date().toISOString(),
        page_summary_available: true,
        page_link: summary.link ?? null,
        page_picture_url: summary.picture?.data?.url ?? null,
      })

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
          metrics = meta_page_daily_snapshot.metrics || EXCLUDED.metrics
        `,
        [
          page.facebook_page_id,
          snapshotDate,
          summary.followers_count ?? null,
          summary.fan_count ?? null,
          JSON.stringify(metrics),
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

/** Post list with reactions, comments, shares — no per-post insights calls. */
export async function syncHourlyPostMetrics() {
  clearMetaPageTokenCache()
  const pages = await listActiveMetaFacebookPages()
  let affected = 0

  for (const page of pages) {
    const runId = await startSyncRun("hourly_posts", page.facebook_page_id)

    try {
      let postsResult = await fetchRecentPagePostsSafe(page, 100)

      if (!postsResult.ok && postsResult.permissionDenied) {
        clearMetaPageTokenCache()
        postsResult = await fetchRecentPagePostsSafe(page, 100)
      }

      if (!postsResult.ok) {
        logMetaSyncEvent({
          source: "posts",
          facebookPageId: page.facebook_page_id,
          brandId: page.brand_id,
          status: "failed",
          errorMessage: postsResult.error,
        })
        throw new Error(postsResult.error)
      }

      const posts = postsResult.data.data ?? []
      logMetaSyncEvent({
        source: "posts",
        facebookPageId: page.facebook_page_id,
        brandId: page.brand_id,
        status: "success",
        recordsAffected: posts.length,
      })
      const followers = await getLatestFollowersForPage(page.facebook_page_id)

      for (const post of posts) {
        const reactions = readPostReactionCount(post)
        const comments = post.comments?.summary?.total_count ?? 0
        const shares = post.shares?.count ?? 0
        const engagementRate = calculateEngagementRate({
          reactions,
          comments,
          shares,
          followers,
        })

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
            JSON.stringify({
              picture_url: post.full_picture ?? null,
              post_type: post.type ?? null,
            }),
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
        await finishSyncRun(
          runId,
          "FAILED",
          0,
          isMetaPermissionError(error)
            ? `${message} (permission)`
            : message
        )
      }
    }
  }

  return affected
}

async function upsertDailyInsightSnapshots(
  facebookPageId: string,
  series: InsightTimeSeries,
  extraPayload: Record<string, unknown>
) {
  let rows = 0

  for (const [snapshotDate, dayMetrics] of Object.entries(series)) {
    const metrics = await mergeSnapshotMetrics(facebookPageId, snapshotDate, {
      ...extraPayload,
      parsed: dayMetrics,
      daily_insights_synced_at: new Date().toISOString(),
    })

    await query(
      `
      INSERT INTO meta_page_daily_snapshot (
        facebook_page_id,
        snapshot_date,
        metrics
      )
      VALUES ($1, $2::date, $3::jsonb)
      ON CONFLICT (facebook_page_id, snapshot_date)
      DO UPDATE SET
        metrics = meta_page_daily_snapshot.metrics || EXCLUDED.metrics
      `,
      [facebookPageId, snapshotDate, JSON.stringify(metrics)]
    )
    rows += 1
  }

  return rows
}

const INSIGHT_METRIC_GROUPS = [
  {
    key: "reach",
    metrics: ["page_impressions_unique"] as const,
  },
  {
    key: "impressions",
    metrics: ["page_impressions"] as const,
  },
  {
    key: "post_engagements",
    metrics: ["page_post_engagements"] as const,
  },
  {
    key: "profile_visits",
    metrics: ["page_views_total"] as const,
  },
  {
    key: "new_likes",
    metrics: ["page_fan_adds"] as const,
  },
  {
    key: "new_followers",
    metrics: ["page_daily_follows", "page_daily_follows_unique"] as const,
  },
] as const

/** Page insights: reach, impressions, engagements — requires read_insights. */
export async function syncDailyInsights() {
  clearMetaPageTokenCache()
  const pages = await listActiveMetaFacebookPages()
  let affected = 0
  const window = resolveMetaAnalyticsWindow("90d")

  for (const page of pages) {
    const runId = await startSyncRun("daily_insights", page.facebook_page_id)

    try {
      const snapshotDate = new Date().toISOString().slice(0, 10)
      let series: InsightTimeSeries = {}
      let anySuccess = false
      let anyFailure = false
      let permissionDenied = false
      const metricErrors: Record<string, string> = {}

      for (const group of INSIGHT_METRIC_GROUPS) {
        let groupSeries: typeof series | null = null

        for (const metricName of group.metrics) {
          const result = await fetchPageInsightsRangeSafe(
            page,
            [metricName],
            window.sinceDate,
            window.untilDate
          )

          if (result.ok && Object.keys(result.series).length > 0) {
            groupSeries = mergeInsightTimeSeries(groupSeries ?? {}, result.series)
            logMetaSyncEvent({
              source: "insights",
              facebookPageId: page.facebook_page_id,
              brandId: page.brand_id,
              dateRange: `${window.since}..${window.until}`,
              metric: metricName,
              status: "success",
              recordsAffected: Object.keys(result.series).length,
            })
            break
          }

          permissionDenied = permissionDenied || result.permissionDenied
          if (!result.ok) {
            metricErrors[`${group.key}:${metricName}`] =
              result.error ?? "Insights metric unavailable"
            logMetaSyncEvent({
              source: "insights",
              facebookPageId: page.facebook_page_id,
              brandId: page.brand_id,
              dateRange: `${window.since}..${window.until}`,
              metric: metricName,
              status: "failed",
              errorMessage: result.error,
            })
          }
        }

        if (groupSeries && Object.keys(groupSeries).length > 0) {
          series = mergeInsightTimeSeries(series, groupSeries)
          anySuccess = true
        } else {
          anyFailure = true
        }
      }

      const insightsPayload: Record<string, unknown> = {
        insights_permission_denied: permissionDenied && !anySuccess,
        insights_sync_failed: !anySuccess && anyFailure,
        insights_partial: anySuccess && anyFailure,
        insight_metric_errors: metricErrors,
        insight_series_days: Object.keys(series).length,
        daily_insights_synced_at: new Date().toISOString(),
        parsed: series[snapshotDate] ?? {},
      }

      if (anySuccess) {
        const rowsWritten = await upsertDailyInsightSnapshots(
          page.facebook_page_id,
          series,
          {
            insights_permission_denied: Boolean(insightsPayload.insights_permission_denied),
            insights_sync_failed: false,
            insights_partial: Boolean(insightsPayload.insights_partial),
            insight_metric_errors: metricErrors,
          }
        )

        const metrics = await mergeSnapshotMetrics(
          page.facebook_page_id,
          snapshotDate,
          insightsPayload
        )

        await query(
          `
          INSERT INTO meta_page_daily_snapshot (
            facebook_page_id,
            snapshot_date,
            metrics
          )
          VALUES ($1, $2::date, $3::jsonb)
          ON CONFLICT (facebook_page_id, snapshot_date)
          DO UPDATE SET
            metrics = meta_page_daily_snapshot.metrics || EXCLUDED.metrics
          `,
          [page.facebook_page_id, snapshotDate, JSON.stringify(metrics)]
        )

        logMetaSyncEvent({
          source: "insights",
          facebookPageId: page.facebook_page_id,
          brandId: page.brand_id,
          dateRange: `${window.since}..${window.until}`,
          status: anyFailure ? "partial" : "success",
          recordsAffected: rowsWritten,
        })

        if (runId) {
          await finishSyncRun(
            runId,
            anyFailure ? "SUCCESS" : "SUCCESS",
            rowsWritten,
            anyFailure ? JSON.stringify(metricErrors) : null
          )
          affected += 1
        }
      } else {
        const metrics = await mergeSnapshotMetrics(
          page.facebook_page_id,
          snapshotDate,
          insightsPayload
        )

        await query(
          `
          INSERT INTO meta_page_daily_snapshot (
            facebook_page_id,
            snapshot_date,
            metrics
          )
          VALUES ($1, $2::date, $3::jsonb)
          ON CONFLICT (facebook_page_id, snapshot_date)
          DO UPDATE SET
            metrics = meta_page_daily_snapshot.metrics || EXCLUDED.metrics
          `,
          [page.facebook_page_id, snapshotDate, JSON.stringify(metrics)]
        )

        logMetaSyncEvent({
          source: "insights",
          facebookPageId: page.facebook_page_id,
          brandId: page.brand_id,
          dateRange: `${window.since}..${window.until}`,
          status: "failed",
          errorMessage: JSON.stringify(metricErrors),
        })

        if (runId) {
          await finishSyncRun(
            runId,
            "FAILED",
            0,
            permissionDenied
              ? "Insights permission denied"
              : JSON.stringify(metricErrors)
          )
        }
      }

      const topPosts = await query<{ post_id: string }>(
        `
        SELECT post_id
        FROM meta_post_metrics
        WHERE facebook_page_id = $1
        ORDER BY reactions_count + comments_count + shares_count DESC
        LIMIT 5
        `,
        [page.facebook_page_id]
      )

      let linkClicksTotal = 0
      let linkClicksFound = false

      for (const row of topPosts.rows) {
        const clicks = await fetchPostLinkClicksSafe(row.post_id, page)
        if (!clicks.ok) {
          continue
        }

        for (const metric of clicks.data.data ?? []) {
          if (metric.name !== "post_clicks") {
            continue
          }
          const latest = metric.values[metric.values.length - 1]
          if (typeof latest?.value === "number") {
            linkClicksTotal += latest.value
            linkClicksFound = true
          }
        }
      }

      if (linkClicksFound) {
        const linkMetrics = await mergeSnapshotMetrics(
          page.facebook_page_id,
          snapshotDate,
          {
            link_clicks_total: linkClicksTotal,
            link_clicks_available: true,
          }
        )

        await query(
          `
          INSERT INTO meta_page_daily_snapshot (
            facebook_page_id,
            snapshot_date,
            metrics
          )
          VALUES ($1, $2::date, $3::jsonb)
          ON CONFLICT (facebook_page_id, snapshot_date)
          DO UPDATE SET
            metrics = meta_page_daily_snapshot.metrics || EXCLUDED.metrics
          `,
          [page.facebook_page_id, snapshotDate, JSON.stringify(linkMetrics)]
        )
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Daily insights sync failed"
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
    case "daily_insights":
      return syncDailyInsights()
    case "weekly_summary":
    case "monthly_summary":
      return syncDailyPageSnapshots()
    default:
      return 0
  }
}

export async function runAllMetaSyncJobs() {
  const dailyPage = await syncDailyPageSnapshots()
  const hourlyPosts = await syncHourlyPostMetrics()
  const dailyInsights = await syncDailyInsights()

  return { dailyPage, hourlyPosts, dailyInsights }
}
