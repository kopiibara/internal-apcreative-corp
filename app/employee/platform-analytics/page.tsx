import { PlatformAnalyticsDashboard } from "@/components/admin/platform-analytics/platform-analytics-dashboard"
import { requireEmployee } from "@/lib/auth/auth-session"
import { loadPlatformAnalyticsPage } from "@/lib/platform-analytics/load-platform-analytics-page"

export const metadata = {
  title: "Platform Analytics",
  description:
    "Unified analytics for Meta, TikTok, YouTube, and Google Ads.",
}

export default async function EmployeePlatformAnalyticsPage() {
  const { profile } = await requireEmployee()
  const page = await loadPlatformAnalyticsPage({
    profile,
    analyticsBasePath: "/employee/platform-analytics",
    unauthorizedPath: "/employee/unauthorized?permission=platform_analytics.view",
  })

  return (
    <PlatformAnalyticsDashboard
      initialData={page.initialData}
      canManage={page.canManage}
      showAdminSyncActions={page.showAdminSyncActions}
      bootstrapMessage={page.bootstrapMessage}
      brandScopeUi={page.brandScopeUi}
      analyticsBasePath={page.analyticsBasePath}
    />
  )
}
