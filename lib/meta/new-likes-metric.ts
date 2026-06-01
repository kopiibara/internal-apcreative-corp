import type { MetaMetricDisplayState } from "@/lib/platform-analytics/format"

export const NEW_LIKES_INSIGHT_METRICS = [
  "page_fan_adds",
  "page_fan_adds_unique",
] as const

export type NewLikesInsightMetric = (typeof NEW_LIKES_INSIGHT_METRICS)[number]

export type NewLikesComputation = {
  value: number | null
  source: "insights" | "snapshot_delta" | null
  insightMetric: NewLikesInsightMetric | null
}

export function resolveNewLikesDisplayState(input: {
  value: number | null
  permissionDenied: boolean
  hasPeriodStartBaseline: boolean
  insightsFromFanAdds: number | null
  metaMetricUnavailable: boolean
}): MetaMetricDisplayState {
  if (input.value !== null) {
    return "available"
  }
  if (input.permissionDenied) {
    return "permission"
  }
  if (input.insightsFromFanAdds === null && !input.hasPeriodStartBaseline) {
    return "no_baseline"
  }
  if (input.metaMetricUnavailable) {
    return "meta_unavailable"
  }
  return "no_data"
}

export function metaNewLikesMetricUnavailable(input: {
  insightMetricErrors: Record<string, string> | null | undefined
  insightsMetricAttempted: boolean
  insightsFromFanAdds: number | null
}): boolean {
  if (input.insightsFromFanAdds !== null) {
    return false
  }

  const errors = input.insightMetricErrors
  if (errors) {
    for (const key of Object.keys(errors)) {
      if (key.startsWith("new_likes:")) {
        return true
      }
    }
  }

  return input.insightsMetricAttempted
}

export function logNewLikesMetricDiagnostic(input: {
  displayName: string
  facebookPageId: string
  dateRange: string
  computation: NewLikesComputation
  displayState: MetaMetricDisplayState
  hasPeriodStartBaseline: boolean
  periodStartPageLikes: number | null
  periodEndPageLikes: number | null
  insightMetricErrors: Record<string, string> | null | undefined
}) {
  if (input.displayState === "available") {
    return
  }

  const newLikesErrors = Object.fromEntries(
    Object.entries(input.insightMetricErrors ?? {}).filter(([key]) =>
      key.startsWith("new_likes:")
    )
  )

  console.warn("[meta-new-likes]", {
    page: input.displayName,
    facebookPageId: input.facebookPageId,
    dateRange: input.dateRange,
    displayState: input.displayState,
    source: input.computation.source,
    insightMetric: input.computation.insightMetric,
    periodStartPageLikes: input.periodStartPageLikes,
    periodEndPageLikes: input.periodEndPageLikes,
    hasPeriodStartBaseline: input.hasPeriodStartBaseline,
    failedMetrics:
      Object.keys(newLikesErrors).length > 0 ? newLikesErrors : undefined,
  })
}
