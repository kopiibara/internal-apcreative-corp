export type MetaMetricDisplayState =
  | "available"
  | "no_data"
  | "permission"
  | "sync_failed"
  | "unavailable"
  | "no_baseline"
  | "meta_unavailable"

export function liveMetric(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "No live data yet"
  }
  return value.toLocaleString("en-PH")
}

export function formatWholeMetric(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "No live data yet"
  }

  return Math.round(value).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })
}

export function formatChartMetric(
  value: string | number | null | undefined,
  options?: { format?: "whole" | "decimal" },
): string {
  if (value === null || value === undefined || value === "") {
    return "-"
  }

  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return String(value)
  }

  if (options?.format === "decimal") {
    return parsed.toLocaleString("en-PH", {
      maximumFractionDigits: 2,
    })
  }

  if (options?.format === "whole" || Number.isInteger(parsed)) {
    return Math.round(parsed).toLocaleString("en-PH", {
      maximumFractionDigits: 0,
    })
  }

  return parsed.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })
}

export function liveText(value: string | null | undefined): string {
  if (!value || value === "—") {
    return "No live data yet"
  }
  return value
}

export function formatMetaMetricDisplay(
  value: number | null | undefined,
  state: MetaMetricDisplayState
): string {
  switch (state) {
    case "permission":
      return "Unavailable from current permission"
    case "sync_failed":
      return "Sync failed"
    case "unavailable":
      return "Unavailable"
    case "no_baseline":
      return "No baseline data yet"
    case "meta_unavailable":
      return "Metric unavailable from Meta"
    case "no_data":
      return "No live data yet"
    case "available":
    default:
      return liveMetric(value)
  }
}

/** @deprecated Use formatMetaMetricDisplay with explicit state */
export function formatMetaMetricValue(
  value: number | null | undefined,
  options?: { unavailable?: boolean }
) {
  if (options?.unavailable) {
    return "Unavailable from current permission"
  }
  return liveMetric(value)
}
