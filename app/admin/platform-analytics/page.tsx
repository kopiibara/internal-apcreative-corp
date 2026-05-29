import { PlatformAnalyticsDashboard } from "@/components/admin/platform-analytics/platform-analytics-dashboard"
import { loadPlatformAnalyticsPage } from "@/lib/platform-analytics/load-platform-analytics-page"
import { requirePlatformAnalyticsView } from "@/lib/platform-analytics/access"

export const metadata = {
  title: "Platform Analytics",
  description:
    "Unified analytics for Meta, TikTok, YouTube, and Google Ads.",
}

export default async function AdminPlatformAnalyticsPage() {
  const context = await requirePlatformAnalyticsView()
  const page = await loadPlatformAnalyticsPage({
    profile: context.profile,
    analyticsBasePath: "/admin/platform-analytics",
    unauthorizedPath: "/admin/unauthorized?permission=platform_analytics.view",
  })

  return (
    <PlatformAnalyticsDashboard
      initialData={page.initialData}
      canManage={page.canManage}
      bootstrapMessage={page.bootstrapMessage}
      brandScopeUi={page.brandScopeUi}
      analyticsBasePath={page.analyticsBasePath}
    />
  )
}
