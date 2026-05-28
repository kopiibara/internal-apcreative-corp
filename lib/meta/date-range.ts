import "server-only"

import type { AnalyticsDateRange } from "@/lib/platform-analytics/types"

export type ResolvedMetaDateWindow = {
  since: string
  until: string
  sinceDate: Date
  untilDate: Date
  label: string
}

const MS_PER_DAY = 86_400_000

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

function shiftDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function resolveMetaAnalyticsWindow(
  range: AnalyticsDateRange = "28d",
  custom?: { from?: string | null; to?: string | null }
): ResolvedMetaDateWindow {
  const today = startOfDay(new Date())
  let sinceDate = today
  let untilDate = endOfDay(today)
  let label = "Last 28 days"

  switch (range) {
    case "today":
      sinceDate = today
      untilDate = endOfDay(today)
      label = "Today"
      break
    case "7d":
      sinceDate = shiftDays(today, -6)
      untilDate = endOfDay(today)
      label = "Last 7 days"
      break
    case "28d":
      sinceDate = shiftDays(today, -27)
      untilDate = endOfDay(today)
      label = "Last 28 days"
      break
    case "month":
      sinceDate = startOfMonth(today)
      untilDate = endOfDay(today)
      label = "This month"
      break
    case "90d":
      sinceDate = shiftDays(today, -89)
      untilDate = endOfDay(today)
      label = "Last 90 days"
      break
    case "365d":
      sinceDate = shiftDays(today, -364)
      untilDate = endOfDay(today)
      label = "Last 365 days"
      break
    case "custom": {
      const from = custom?.from?.trim()
      const to = custom?.to?.trim()
      if (from && to) {
        sinceDate = startOfDay(new Date(`${from}T00:00:00.000Z`))
        untilDate = endOfDay(new Date(`${to}T00:00:00.000Z`))
        label = `${from} – ${to}`
      } else {
        sinceDate = shiftDays(today, -27)
        untilDate = endOfDay(today)
        label = "Custom range"
      }
      break
    }
    default:
      sinceDate = shiftDays(today, -27)
      untilDate = endOfDay(today)
      label = "Last 28 days"
  }

  return {
    since: formatDateOnly(sinceDate),
    until: formatDateOnly(untilDate),
    sinceDate,
    untilDate,
    label,
  }
}

export type InsightUnixWindow = {
  since: number
  until: number
}

/** Meta Page Insights allow at most 90 days per since/until request. */
export function chunkInsightUnixWindows(
  sinceDate: Date,
  untilDate: Date,
  maxDays = 90
): InsightUnixWindow[] {
  const chunks: InsightUnixWindow[] = []
  let cursor = startOfDay(sinceDate)
  const end = endOfDay(untilDate)

  while (cursor.getTime() <= end.getTime()) {
    const chunkEnd = endOfDay(shiftDays(cursor, maxDays - 1))
    const boundedEnd = chunkEnd.getTime() > end.getTime() ? end : chunkEnd

    chunks.push({
      since: Math.floor(cursor.getTime() / 1000),
      until: Math.floor(boundedEnd.getTime() / 1000),
    })

    cursor = startOfDay(shiftDays(boundedEnd, 1))
  }

  return chunks.length > 0 ? chunks : [{ since: 0, until: Math.floor(end.getTime() / 1000) }]
}

export function daysInWindow(since: string, until: string) {
  const start = startOfDay(new Date(`${since}T00:00:00.000Z`))
  const end = startOfDay(new Date(`${until}T00:00:00.000Z`))
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1)
}
