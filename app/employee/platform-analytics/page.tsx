import { PlatformAnalyticsDashboard } from "@/components/admin/platform-analytics/platform-analytics-dashboard"
import { requireEmployee } from "@/lib/auth/auth-session"
import { loadPlatformAnalyticsPage } from "@/lib/platform-analytics/load-platform-analytics-page"
import type { AnalyticsPlatform } from "@/lib/platform-analytics/types"

export const metadata = {
  title: "Platform Analytics",
  description:
    "Unified analytics for Meta, TikTok, YouTube, and Google Ads.",
}

type EmployeePlatformAnalyticsPageProps = {
  searchParams: Promise<{ platform?: string }>
}

function parsePlatformParam(value?: string): AnalyticsPlatform | undefined {
  if (value === "YOUTUBE" || value === "TIKTOK" || value === "GOOGLE" || value === "META") {
    return value
  }
  return undefined
}

export default async function EmployeePlatformAnalyticsPage({
  searchParams,
}: EmployeePlatformAnalyticsPageProps) {
  const params = await searchParams
  const { profile } = await requireEmployee()
  const page = await loadPlatformAnalyticsPage({
    profile,
    analyticsBasePath: "/employee/platform-analytics",
    unauthorizedPath: "/employee/unauthorized?permission=platform_analytics.view",
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
