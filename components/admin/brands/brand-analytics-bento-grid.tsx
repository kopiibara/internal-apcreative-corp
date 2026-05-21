import { BrandAnalyticsBentoCard } from "@/components/admin/brands/brand-analytics-bento-card"
import {
  getBrandAnalyticsBentoLayout,
  type BrandAnalyticsMetricKey,
} from "@/lib/brand-analytics-status"
import type { BrandApprovalMetrics } from "@/lib/brand-analytics"
import { cn } from "@/lib/utils"

type BrandAnalyticsBentoGridProps = {
  metrics: BrandApprovalMetrics
  className?: string
}

function toMetricRecord(
  metrics: BrandApprovalMetrics
): Record<BrandAnalyticsMetricKey, number> {
  return {
    totalRequests: metrics.totalRequests,
    pending: metrics.pending,
    approved: metrics.approved,
    revisions: metrics.revisions,
    rejected: metrics.rejected,
    scheduled: metrics.scheduled,
    published: metrics.published,
  }
}

export function BrandAnalyticsBentoGrid({
  metrics,
  className,
}: BrandAnalyticsBentoGridProps) {
  const items = getBrandAnalyticsBentoLayout(toMetricRecord(metrics))

  return (
    <div
      className={cn(
        "grid h-full min-h-0 grid-cols-3 grid-rows-2 items-stretch gap-2 sm:gap-4",
        className
      )}
    >
      {items.map((item) => (
        <BrandAnalyticsBentoCard key={item.key} item={item} />
      ))}
    </div>
  )
}
