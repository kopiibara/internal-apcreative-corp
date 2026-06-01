/**
 * Debug New likes: Meta API raw metrics vs DB snapshots per page.
 *
 * Usage: npx tsx scripts/meta-debug-new-likes.ts
 */
import { config as loadEnv } from "dotenv"

loadEnv()
loadEnv({ path: ".env.local", override: true })

import { Pool } from "pg"

import { getResolvedDatabaseUrl } from "../lib/database-url"

const TARGET_NAMES = [
  "neon nights",
  "oculto",
  "al qaysar",
  "pro group",
]

const NEW_LIKES_METRICS = [
  "page_fan_adds",
  "page_fan_adds_unique",
  "page_fans",
] as const

function stripEnvQuotes(value: string) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function readEnv(name: string) {
  const raw = process.env[name]
  if (raw == null) return ""
  return stripEnvQuotes(raw)
}

function discoverPages() {
  const entries: Array<{
    displayName: string
    pageId: string
    token: string
    prefix: string
  }> = []

  for (const key of Object.keys(process.env)) {
    if (!key.endsWith("_META_PAGE_ID")) continue
    const prefix = key.replace(/_META_PAGE_ID$/, "")
    const tokenKey = `${prefix}_META_PAGE_ACCESS_TOKEN`
    const enabledRaw = readEnv(`${prefix}_META_ENABLED`)
    const enabled =
      enabledRaw === ""
        ? true
        : enabledRaw.toLowerCase() === "true"
    const pageId = readEnv(key).replace(/\D/g, "")
    const token = readEnv(tokenKey)
    if (!enabled || !pageId || !token) continue

    const displayName = prefix
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())

    entries.push({ displayName, pageId, token, prefix })
  }

  return entries.filter((p) =>
    TARGET_NAMES.some((n) => p.displayName.toLowerCase().includes(n))
  )
}

function dateRange28d() {
  const until = new Date()
  const since = new Date(until)
  since.setDate(since.getDate() - 27)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return {
    since: fmt(since),
    until: fmt(until),
    sinceUnix: Math.floor(since.getTime() / 1000),
    untilUnix: Math.floor(until.getTime() / 1000) + 86400,
  }
}

async function fetchMetric(
  pageId: string,
  token: string,
  metric: string,
  sinceUnix: number,
  untilUnix: number
) {
  const url = new URL(`https://graph.facebook.com/v21.0/${pageId}/insights`)
  url.searchParams.set("metric", metric)
  url.searchParams.set("period", "day")
  url.searchParams.set("since", String(sinceUnix))
  url.searchParams.set("until", String(untilUnix))
  url.searchParams.set("access_token", token)

  const res = await fetch(url)
  const body = (await res.json()) as {
    error?: { message?: string; code?: number; type?: string }
    data?: Array<{
      name: string
      values: Array<{ value: number; end_time?: string }>
    }>
  }

  if (!res.ok || body.error) {
    return {
      ok: false as const,
      error: body.error?.message ?? `HTTP ${res.status}`,
      dayCount: 0,
      sum: 0,
    }
  }

  const metricData = body.data?.find((m) => m.name === metric)
  const values = metricData?.values ?? []
  let sum = 0
  for (const point of values) {
    if (typeof point.value === "number") sum += point.value
  }

  return {
    ok: true as const,
    dayCount: values.length,
    sum,
    sample: values.slice(0, 2),
    last: values[values.length - 1],
  }
}

async function main() {
  const pool = new Pool({ connectionString: getResolvedDatabaseUrl() })
  const window = dateRange28d()
  const pages = discoverPages()

  if (pages.length === 0) {
    console.log("No matching enabled pages in env (_META_ENABLED=true).")
    await pool.end()
    return
  }

  console.log(`Date range: ${window.since} .. ${window.until}\n`)

  for (const page of pages) {
    console.log("=".repeat(72))
    console.log(`${page.displayName} (${page.prefix})`)
    console.log(`facebook_page_id: ${page.pageId}`)

    console.log("\n--- Meta Graph API ---")
    for (const metric of NEW_LIKES_METRICS) {
      const result = await fetchMetric(
        page.pageId,
        page.token,
        metric,
        window.sinceUnix,
        window.untilUnix
      )
      if (result.ok) {
        console.log(
          `  ${metric}: ok days=${result.dayCount} sum=${result.sum} last=${JSON.stringify(result.last)}`
        )
      } else {
        console.log(`  ${metric}: FAILED — ${result.error}`)
      }
    }

    console.log("\n--- DB meta_page_daily_snapshot ---")
    const snapshots = await pool.query<{
      snapshot_date: string
      page_likes: number | null
      metrics: Record<string, unknown> | null
    }>(
      `
      SELECT snapshot_date::text, page_likes, metrics
      FROM meta_page_daily_snapshot
      WHERE facebook_page_id = $1
        AND snapshot_date >= $2::date
        AND snapshot_date <= $3::date
      ORDER BY snapshot_date ASC
      `,
      [page.pageId, window.since, window.until]
    )

    let fanAddsDays = 0
    let fanAddsSum = 0
    for (const row of snapshots.rows) {
      const parsed = row.metrics?.parsed as Record<string, number> | undefined
      const v = parsed?.page_fan_adds
      if (typeof v === "number") {
        fanAddsDays += 1
        fanAddsSum += v
      }
    }

    console.log(`  rows in range: ${snapshots.rows.length}`)
    console.log(`  days with page_fan_adds: ${fanAddsDays} sum=${fanAddsDays ? fanAddsSum : "n/a"}`)

    const latest = await pool.query<{
      snapshot_date: string
      page_likes: number | null
    }>(
      `
      SELECT snapshot_date::text, page_likes
      FROM meta_page_daily_snapshot
      WHERE facebook_page_id = $1 AND page_likes IS NOT NULL
      ORDER BY snapshot_date DESC
      LIMIT 1
      `,
      [page.pageId]
    )

    const periodStart = await pool.query<{
      snapshot_date: string
      page_likes: number | null
    }>(
      `
      SELECT snapshot_date::text, page_likes
      FROM meta_page_daily_snapshot
      WHERE facebook_page_id = $1
        AND page_likes IS NOT NULL
        AND snapshot_date <= $2::date
      ORDER BY snapshot_date DESC
      LIMIT 1
      `,
      [page.pageId, window.since]
    )

    const prevOffset1 = await pool.query<{
      snapshot_date: string
      page_likes: number | null
    }>(
      `
      SELECT snapshot_date::text, page_likes
      FROM meta_page_daily_snapshot
      WHERE facebook_page_id = $1 AND page_likes IS NOT NULL
      ORDER BY snapshot_date DESC
      OFFSET 1
      LIMIT 1
      `,
      [page.pageId]
    )

    const L = latest.rows[0]
    const S = periodStart.rows[0]
    const P = prevOffset1.rows[0]

    console.log("\n--- Baseline page_likes ---")
    console.log(`  latest: ${L?.snapshot_date ?? "-"} likes=${L?.page_likes ?? "null"}`)
    console.log(
      `  period start: ${S?.snapshot_date ?? "-"} likes=${S?.page_likes ?? "null"}`
    )
    console.log(
      `  offset 1: ${P?.snapshot_date ?? "-"} likes=${P?.page_likes ?? "null"}`
    )
    if (L?.page_likes != null && S?.page_likes != null) {
      console.log(`  delta (latest - period start): ${L.page_likes - S.page_likes}`)
    }

    const errRow = await pool.query<{ metrics: Record<string, unknown> }>(
      `
      SELECT metrics
      FROM meta_page_daily_snapshot
      WHERE facebook_page_id = $1
        AND metrics ? 'insight_metric_errors'
      ORDER BY snapshot_date DESC
      LIMIT 1
      `,
      [page.pageId]
    )
    const errors = errRow.rows[0]?.metrics?.insight_metric_errors as
      | Record<string, string>
      | undefined
    if (errors) {
      console.log("\n--- insight_metric_errors (latest) ---")
      for (const [k, v] of Object.entries(errors)) {
        if (k.includes("new_likes") || k.includes("fan")) {
          console.log(`  ${k}: ${v}`)
        }
      }
    }

    console.log()
  }

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
