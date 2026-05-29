import { PlatformAnalyticsDashboard } from "@/components/admin/platform-analytics/platform-analytics-dashboard"
import { bootstrapMetaMonitoring } from "@/lib/meta/bootstrap"
import { getPlatformAnalyticsDashboardData } from "@/lib/platform-analytics/get-dashboard-data"
import {
  canManagePlatformAnalytics,
  requirePlatformAnalyticsView,
} from "@/lib/platform-analytics/access"
import {
  getPlatformAnalyticsBrandScope,
  toPlatformAnalyticsBrandScopeUi,
} from "@/lib/platform-analytics/brand-scope"

export const metadata = {
  title: "Platform Analytics",
  description:
    "Unified analytics for Meta, TikTok, YouTube, and Google Ads.",
}

export default async function AdminPlatformAnalyticsPage() {
  const context = await requirePlatformAnalyticsView()
  const canManage = await canManagePlatformAnalytics(
    context.profile.auth_user_id
  )

  let initialData = await getPlatformAnalyticsDashboardData({
    platform: "META",
    accountId: null,
    metaScope: "combined",
    profileId: context.profile.id,
  })
  const brandScope = await getPlatformAnalyticsBrandScope(context.profile.id)
  const brandScopeUi = toPlatformAnalyticsBrandScopeUi(
    brandScope,
    initialData.metaBusinessPages
  )
  let bootstrapMessage: string | null = null

  if (
    canManage &&
    initialData.metaNeedsBootstrap &&
    initialData.platform === "META"
  ) {
    try {
      const result = await bootstrapMetaMonitoring()
      initialData = await getPlatformAnalyticsDashboardData({
        platform: "META",
        accountId: null,
        metaScope: "combined",
        profileId: context.profile.id,
      })
      bootstrapMessage =
        result.dailySnapshots > 0 || result.postMetrics > 0
          ? `Auto-connected ${result.registeredCount} Meta account(s) and synced analytics.`
          : result.errors[0] ??
            "Accounts registered. Run sync again if analytics are still empty."
    } catch (error) {
      bootstrapMessage =
        error instanceof Error
          ? error.message
          : "Auto-connect failed. Use Connect & sync manually."
    }
  }

  return (
    <PlatformAnalyticsDashboard
      initialData={initialData}
      canManage={canManage}
      bootstrapMessage={bootstrapMessage}
      brandScopeUi={brandScopeUi}
      analyticsBasePath="/admin/platform-analytics"
    />
  )
}
