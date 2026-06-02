const DEFAULT_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export function formatRecentOrDateTime(
  value: string | Date,
  formatter: Intl.DateTimeFormat = DEFAULT_DATE_TIME_FORMATTER
) {
  const date = value instanceof Date ? value : new Date(value)
  const timestamp = date.getTime()

  if (Number.isNaN(timestamp)) {
    return ""
  }

  const elapsedMs = Date.now() - timestamp
  const oneDayMs = 24 * 60 * 60 * 1000

  if (elapsedMs < 0 || elapsedMs >= oneDayMs) {
    return formatter.format(date)
  }

  const elapsedMinutes = Math.max(1, Math.floor(elapsedMs / (60 * 1000)))

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min${elapsedMinutes === 1 ? "" : "s"} ago`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)

  return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`
}
