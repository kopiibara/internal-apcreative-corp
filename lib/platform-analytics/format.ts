export type MetaMetricDisplayState =
  | "available"
  | "no_data"
  | "permission"
  | "sync_failed"
  | "unavailable"

export function liveMetric(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "No live data yet"
  }
  return value.toLocaleString("en-PH")
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
