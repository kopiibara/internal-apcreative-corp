import { BrandAnalyticsCard } from "@/components/admin/brands/brand-analytics-card"
import type { BrandApprovalMetrics } from "@/lib/brand-analytics"

type BrandApprovalSummaryProps = {
  metrics: BrandApprovalMetrics
}

export function BrandApprovalSummary({ metrics }: BrandApprovalSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <BrandAnalyticsCard
        value={metrics.totalRequests}
        metric="totalRequests"
      />
      <BrandAnalyticsCard value={metrics.pending} metric="pending" />
      <BrandAnalyticsCard value={metrics.approved} metric="approved" />
      <BrandAnalyticsCard value={metrics.revisions} metric="revisions" />
      <BrandAnalyticsCard value={metrics.rejected} metric="rejected" />
      <BrandAnalyticsCard value={metrics.scheduled} metric="scheduled" />
      <BrandAnalyticsCard value={metrics.published} metric="published" />
    </div>
  )
}
