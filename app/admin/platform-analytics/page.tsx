import { PlatformAnalyticsDashboard } from "@/components/admin/platform-analytics/platform-analytics-dashboard"
import { bootstrapMetaMonitoring } from "@/lib/meta/bootstrap"
import { getPlatformAnalyticsDashboardData } from "@/lib/platform-analytics/get-dashboard-data"
import { can, requirePermission } from "@/lib/permissions"

export const metadata = {
  title: "Platform Analytics",
  description:
    "Unified analytics for Meta, TikTok, YouTube, and Google Ads.",
}

export default async function AdminPlatformAnalyticsPage() {
  const context = await requirePermission("meta_monitoring.view")
  const canManage = await can(
    context.profile.auth_user_id,
    "meta_monitoring.manage"
  )

  let initialData = await getPlatformAnalyticsDashboardData({
    platform: "META",
    accountId: null,
    metaScope: "combined",
  })
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
    />
  )
}
