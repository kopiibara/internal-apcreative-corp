import type { BrandApprovalMetrics, RecentBrandApproval } from "@/lib/brand-analytics"
import type { Brand } from "@/lib/brands"

export type BrandPermissionFlags = {
  canCreate: boolean
  canUpdate: boolean
  canDeactivate: boolean
  canDelete: boolean
  canViewAnalytics: boolean
}

export type BrandWithAnalytics = Brand & {
  metrics: BrandApprovalMetrics
  recentApprovals: RecentBrandApproval[]
}
