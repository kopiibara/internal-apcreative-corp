import { PlatformAnalyticsDashboard } from "@/components/admin/platform-analytics/platform-analytics-dashboard"
import { loadPlatformAnalyticsPage } from "@/lib/platform-analytics/load-platform-analytics-page"
import { requirePlatformAnalyticsView } from "@/lib/platform-analytics/access"
import type { AnalyticsPlatform } from "@/lib/platform-analytics/types"

export const metadata = {
  title: "Platform Analytics",
  description:
    "Unified analytics for Meta, TikTok, YouTube, and Google Ads.",
}

type AdminPlatformAnalyticsPageProps = {
  searchParams: Promise<{ platform?: string }>
}

function parsePlatformParam(value?: string): AnalyticsPlatform | undefined {
  if (value === "YOUTUBE" || value === "TIKTOK" || value === "GOOGLE" || value === "META") {
    return value
  }
  return undefined
}

export default async function AdminPlatformAnalyticsPage({
  searchParams,
}: AdminPlatformAnalyticsPageProps) {
  const params = await searchParams
  const context = await requirePlatformAnalyticsView()
  const page = await loadPlatformAnalyticsPage({
    profile: context.profile,
    analyticsBasePath: "/admin/platform-analytics",
    unauthorizedPath: "/admin/unauthorized?permission=platform_analytics.view",
    initialPlatform: parsePlatformParam(params.platform),
  })

  return (
    <PlatformAnalyticsDashboard
      initialData={page.initialData}
      initialPlatform={page.initialPlatform}
      canManage={page.canManage}
      showAdminSyncActions={page.showAdminSyncActions}
      bootstrapMessage={page.bootstrapMessage}
      brandScopeUi={page.brandScopeUi}
      analyticsBasePath={page.analyticsBasePath}
    />
  )
}
