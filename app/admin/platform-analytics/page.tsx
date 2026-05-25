import { MetaFacebookMonitoringDashboard } from "@/components/admin/platform-analytics/meta-facebook-monitoring-dashboard"
import { bootstrapMetaMonitoring } from "@/lib/meta/bootstrap"
import { getMetaMonitoringDashboardData } from "@/lib/meta/monitoring-data"
import { can, requirePermission } from "@/lib/permissions"

export default async function AdminPlatformAnalyticsPage() {
  const context = await requirePermission("meta_monitoring.view")
  const canManage = await can(
    context.profile.auth_user_id,
    "meta_monitoring.manage"
  )

  let initialData = await getMetaMonitoringDashboardData()
  let bootstrapMessage: string | null = null

  if (
    canManage &&
    initialData.integrationStatus.needsBootstrap &&
    initialData.integrationStatus.graphTokenConfigured
  ) {
    try {
      const result = await bootstrapMetaMonitoring()
      initialData = await getMetaMonitoringDashboardData()
      bootstrapMessage =
        result.dailySnapshots > 0 || result.postMetrics > 0
          ? `Auto-connected ${result.registeredCount} Facebook Page(s) and synced analytics.`
          : result.errors[0] ??
            "Pages registered. Run sync again if analytics are still empty."
    } catch (error) {
      bootstrapMessage =
        error instanceof Error
          ? error.message
          : "Auto-connect failed. Use Connect & sync manually."
    }
  }

  return (
    <MetaFacebookMonitoringDashboard
      initialData={initialData}
      canManage={canManage}
      bootstrapMessage={bootstrapMessage}
    />
  )
}
