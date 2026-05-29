/** Vertical space for a horizontal (layout="vertical") bar chart. */
export function getCategoryChartHeight(
  itemCount: number,
  options?: {
    rowHeight?: number
    padding?: number
    min?: number
    max?: number
  },
) {
  const rowHeight = options?.rowHeight ?? 36
  const padding = options?.padding ?? 48
  const min = options?.min ?? 220
  const max = options?.max ?? 520

  if (itemCount <= 0) {
    return min
  }

  return Math.min(max, Math.max(min, itemCount * rowHeight + padding))
}

/** Y-axis width for category labels on horizontal bar charts. */
export function getCategoryAxisWidth(
  labels: string[],
  options?: {
    min?: number
    max?: number
    charWidth?: number
  },
) {
  const min = options?.min ?? 96
  const max = options?.max ?? 220
  const charWidth = options?.charWidth ?? 6.5
  const longest = labels.reduce(
    (longestLabel, label) => Math.max(longestLabel, label.length),
    0,
  )

  return Math.min(max, Math.max(min, Math.ceil(longest * charWidth) + 20))
}

export function truncateChartLabel(value: string, maxLength = 24) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
}
