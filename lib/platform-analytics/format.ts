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
