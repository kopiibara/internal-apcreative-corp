import {
  CalendarClock,
  CheckCheck,
  Clock,
  FileText,
  RotateCcw,
  Send,
  XCircle,
  type LucideIcon,
} from "lucide-react"

export type BrandAnalyticsMetricKey =
  | "totalRequests"
  | "pending"
  | "approved"
  | "revisions"
  | "rejected"
  | "scheduled"
  | "published"

export type BrandAnalyticsSizeTier = "primary" | "secondary" | "compact"

export const BRAND_ANALYTICS_CARD_CONFIG = {
  totalRequests: {
    label: "Total Content Requests",
    icon: FileText,
    className: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  approved: {
    label: "Approved",
    icon: CheckCheck,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  revisions: {
    label: "Revisions",
    icon: RotateCcw,
    className: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  scheduled: {
    label: "Scheduled",
    icon: CalendarClock,
    className: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  published: {
    label: "Published",
    icon: Send,
    className: "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-300",
  },
} satisfies Record<
  BrandAnalyticsMetricKey,
  {
    label: string
    icon: LucideIcon
    className: string
  }
>

export const BRAND_BENTO_METRIC_ORDER: BrandAnalyticsMetricKey[] = [
  "pending",
  "approved",
  "revisions",
  "rejected",
  "scheduled",
  "published",
]

const BRAND_ANALYTICS_SIZE_TIER_SPAN: Record<BrandAnalyticsSizeTier, string> = {
  primary: "col-span-1 row-span-1 h-full",
  secondary: "col-span-1 row-span-1 h-full",
  compact: "col-span-1 row-span-1 h-full",
}

export function getBrandAnalyticsCardConfig(metric: BrandAnalyticsMetricKey) {
  return BRAND_ANALYTICS_CARD_CONFIG[metric]
}

export function getBrandAnalyticsSizeTierSpan(tier: BrandAnalyticsSizeTier) {
  return BRAND_ANALYTICS_SIZE_TIER_SPAN[tier]
}

export type BrandAnalyticsBentoItem = {
  key: BrandAnalyticsMetricKey
  value: number
  sizeTier: BrandAnalyticsSizeTier
  isHighlighted: boolean
  spanClassName: string
}

function getMetricValue(
  metrics: Record<BrandAnalyticsMetricKey, number>,
  key: BrandAnalyticsMetricKey
) {
  return metrics[key] ?? 0
}

function getUniqueMetricValues(
  metrics: Record<BrandAnalyticsMetricKey, number>
) {
  return [
    ...new Set(
      BRAND_BENTO_METRIC_ORDER.map((key) => getMetricValue(metrics, key))
    ),
  ].sort((left, right) => right - left)
}

export function getBrandAnalyticsValueTierMap(
  metrics: Record<BrandAnalyticsMetricKey, number>
): Map<number, BrandAnalyticsSizeTier> {
  const uniqueValues = getUniqueMetricValues(metrics)
  const tierByValue = new Map<number, BrandAnalyticsSizeTier>()

  if (uniqueValues.length === 1 && uniqueValues[0] === 0) {
    tierByValue.set(0, "primary")
    return tierByValue
  }

  uniqueValues.forEach((value, index) => {
    if (index === 0) {
      tierByValue.set(value, "primary")
      return
    }

    if (index === 1) {
      tierByValue.set(value, "secondary")
      return
    }

    tierByValue.set(value, "compact")
  })

  return tierByValue
}

export function getHighlightedBrandAnalyticsMetrics(
  metrics: Record<BrandAnalyticsMetricKey, number>
): BrandAnalyticsMetricKey[] {
  const maxValue = Math.max(
    ...BRAND_BENTO_METRIC_ORDER.map((key) => getMetricValue(metrics, key))
  )

  if (maxValue === 0) {
    return []
  }

  return BRAND_BENTO_METRIC_ORDER.filter(
    (key) => getMetricValue(metrics, key) === maxValue
  )
}

export function getBrandAnalyticsBentoLayout(
  metrics: Record<BrandAnalyticsMetricKey, number>
): BrandAnalyticsBentoItem[] {
  const tierByValue = getBrandAnalyticsValueTierMap(metrics)
  const highlightedKeys = new Set(
    getHighlightedBrandAnalyticsMetrics(metrics)
  )

  return BRAND_BENTO_METRIC_ORDER.map((key) => {
    const value = getMetricValue(metrics, key)
    const sizeTier = tierByValue.get(value) ?? "compact"
    const isHighlighted = highlightedKeys.has(key)

    return {
      key,
      value,
      sizeTier,
      isHighlighted,
      spanClassName: getBrandAnalyticsSizeTierSpan(sizeTier),
    }
  })
}
