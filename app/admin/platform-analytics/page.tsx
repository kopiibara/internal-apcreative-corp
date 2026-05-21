import { MetaFacebookMonitoringDashboard } from "@/components/admin/platform-analytics/meta-facebook-monitoring-dashboard"
import { getMetaMonitoringDashboardData } from "@/lib/meta/monitoring-data"
import { can, requirePermission } from "@/lib/permissions"

export default async function AdminPlatformAnalyticsPage() {
  const context = await requirePermission("meta_monitoring.view")
  const [initialData, canManage] = await Promise.all([
    getMetaMonitoringDashboardData(),
    can(context.profile.auth_user_id, "meta_monitoring.manage"),
  ])

  return (
    <MetaFacebookMonitoringDashboard
      initialData={initialData}
      canManage={canManage}
    />
  )
}
