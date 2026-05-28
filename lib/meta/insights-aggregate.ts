import "server-only"

export type InsightTimeSeries = Record<string, Record<string, number>>

export function parseInsightTimeSeries(
  insights: Array<{
    name: string
    values: Array<{ value: number | Record<string, number>; end_time?: string }>
  }>
): InsightTimeSeries {
  const byDate: InsightTimeSeries = {}

  for (const metric of insights) {
    for (const point of metric.values) {
      const date = point.end_time?.slice(0, 10)
      if (!date) {
        continue
      }

      if (!byDate[date]) {
        byDate[date] = {}
      }

      const value = point.value
      if (typeof value === "number") {
        byDate[date][metric.name] =
          (byDate[date][metric.name] ?? 0) + value
      }
    }
  }

  return byDate
}

export function sumInsightMetricInRange(
  series: InsightTimeSeries,
  metricName: string,
  since: string,
  until: string
): number | null {
  let total = 0
  let found = false

  for (const [date, metrics] of Object.entries(series)) {
    if (date < since || date > until) {
      continue
    }
    const value = metrics[metricName]
    if (typeof value === "number") {
      total += value
      found = true
    }
  }

  return found ? total : null
}

export function sumParsedMetricsWithFallback(
  snapshots: Array<{
    snapshot_date: string
    metrics: Record<string, unknown> | null
  }>,
  metricNames: string[],
  since: string,
  until: string
): number | null {
  for (const metricName of metricNames) {
    const total = sumParsedMetricsInSnapshots(
      snapshots,
      metricName,
      since,
      until
    )
    if (total !== null) {
      return total
    }
  }

  return null
}

export function sumParsedMetricsInSnapshots(
  snapshots: Array<{ snapshot_date: string; metrics: Record<string, unknown> | null }>,
  metricName: string,
  since: string,
  until: string
): number | null {
  let total = 0
  let found = false

  for (const row of snapshots) {
    if (row.snapshot_date < since || row.snapshot_date > until) {
      continue
    }
    const parsed = row.metrics?.parsed as Record<string, number> | undefined
    const value = parsed?.[metricName]
    if (typeof value === "number") {
      total += value
      found = true
    }
  }

  return found ? total : null
}

export function mergeInsightTimeSeries(
  target: InsightTimeSeries,
  source: InsightTimeSeries
): InsightTimeSeries {
  const merged: InsightTimeSeries = { ...target }

  for (const [date, metrics] of Object.entries(source)) {
    merged[date] = { ...(merged[date] ?? {}), ...metrics }
  }

  return merged
}

export function sumReactionInsightMetrics(
  parsed: Record<string, number>
): number | null {
  const totalMetric = parsed.page_actions_post_reactions_total
  if (typeof totalMetric === "number") {
    return totalMetric
  }

  const parts = [
    "page_actions_post_reactions_like_total",
    "page_actions_post_reactions_love_total",
    "page_actions_post_reactions_wow_total",
    "page_actions_post_reactions_haha_total",
    "page_actions_post_reactions_sorry_total",
    "page_actions_post_reactions_anger_total",
  ]

  let total = 0
  let found = false
  for (const key of parts) {
    const value = parsed[key]
    if (typeof value === "number") {
      total += value
      found = true
    }
  }

  return found ? total : null
}
