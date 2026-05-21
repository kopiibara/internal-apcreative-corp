import { BrandManagement } from "@/components/admin/brands/brand-management"
import type { BrandWithAnalytics } from "@/components/admin/brands/types"
import {
  getBrandApprovalMetrics,
  getRecentBrandApprovals,
  type BrandApprovalMetrics,
} from "@/lib/brand-analytics"
import { getBrands } from "@/lib/brands"
import { can, requirePermission } from "@/lib/permissions"

const emptyMetrics: BrandApprovalMetrics = {
  brandId: 0,
  totalRequests: 0,
  pending: 0,
  revisions: 0,
  rejected: 0,
  approved: 0,
  scheduled: 0,
  published: 0,
}

export default async function BrandsPage() {
  const context = await requirePermission("brands.view")
  const [
    brands,
    canCreate,
    canUpdate,
    canDelete,
    canDeactivatePermission,
    canAnalyticsView,
  ] = await Promise.all([
    getBrands(),
    can(context.profile.auth_user_id, "brands.create"),
    can(context.profile.auth_user_id, "brands.update"),
    can(context.profile.auth_user_id, "brands.delete"),
    can(context.profile.auth_user_id, "brands.deactivate"),
    can(context.profile.auth_user_id, "brands.analytics.view"),
  ])
  const canDeactivate = canDeactivatePermission || canUpdate
  const [metrics, recentApprovals] = canAnalyticsView
    ? await Promise.all([getBrandApprovalMetrics(), getRecentBrandApprovals()])
    : [[], []]
  const metricsByBrandId = new Map(
    metrics.map((brandMetrics) => [brandMetrics.brandId, brandMetrics] as const)
  )
  const recentApprovalsByBrandId = new Map<number, typeof recentApprovals>()

  for (const approval of recentApprovals) {
    if (!approval.brandId) {
      continue
    }

    const approvals = recentApprovalsByBrandId.get(approval.brandId) ?? []
    approvals.push(approval)
    recentApprovalsByBrandId.set(approval.brandId, approvals)
  }

  const brandsWithAnalytics: BrandWithAnalytics[] = brands.map((brand) => ({
    ...brand,
    metrics: metricsByBrandId.get(brand.id) ?? {
      ...emptyMetrics,
      brandId: brand.id,
    },
    recentApprovals: recentApprovalsByBrandId.get(brand.id) ?? [],
  }))

  return (
    <BrandManagement
      brands={brandsWithAnalytics}
      permissions={{
        canCreate,
        canUpdate,
        canDeactivate,
        canDelete,
        canViewAnalytics: canAnalyticsView,
      }}
    />
  )
}