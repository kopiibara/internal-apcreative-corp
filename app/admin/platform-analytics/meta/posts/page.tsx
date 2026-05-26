import { MetaPostsAnalyticsDashboard } from "@/components/admin/platform-analytics/meta/meta-posts-analytics-dashboard"
import { Card, CardContent } from "@/components/ui/card"
import {
  getMetaPostByPostId,
  getMetaPostsPageData,
} from "@/lib/meta/posts-analytics"
import { getActiveMetaPages } from "@/lib/meta/pages-config"
import type { MetaPageConfigKey } from "@/lib/meta/pages-config"
import { requirePermission } from "@/lib/permissions"

export const metadata = {
  title: "Meta Posts Analytics",
  description: "Facebook post-level analytics for Neon Nights Bar Club.",
}

type MetaPostsPageProps = {
  searchParams: Promise<{
    pageKey?: string
    page?: string
    pageSize?: string
    sort?: string
    search?: string
    dateFrom?: string
    dateTo?: string
    postId?: string
  }>
}

function parsePageKey(value: string | undefined): MetaPageConfigKey {
  if (value === "pro-group" || value === "al-qaysar") {
    return value
  }
  return "neon-nights"
}

function parsePageSize(value: string | undefined): 10 | 25 | 50 {
  const parsed = Number(value)
  if (parsed === 25 || parsed === 50) {
    return parsed
  }
  return 10
}

export default async function MetaPostsAnalyticsPage({
  searchParams,
}: MetaPostsPageProps) {
  await requirePermission("meta_monitoring.view")

  const params = await searchParams
  const pageKey = parsePageKey(params.pageKey)
  const activePages = getActiveMetaPages()

  if (activePages.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No Meta business pages are enabled. Set{" "}
          <code className="text-xs">NEON_NIGHTS_META_ENABLED=true</code> and
          configure the Page ID and access token.
        </CardContent>
      </Card>
    )
  }

  const data = await getMetaPostsPageData({
    pageKey,
    page: Math.max(1, Number(params.page) || 1),
    pageSize: parsePageSize(params.pageSize),
    sort:
      params.sort === "highest_engagement" ||
      params.sort === "most_comments" ||
      params.sort === "most_shares" ||
      params.sort === "most_reactions"
        ? params.sort
        : "latest",
    search: params.search,
    dateFrom: params.dateFrom ?? null,
    dateTo: params.dateTo ?? null,
  })

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Meta posts analytics is not available for this page configuration.
        </CardContent>
      </Card>
    )
  }

  const highlightPost = params.postId
    ? await getMetaPostByPostId(pageKey, params.postId)
    : null

  return (
    <MetaPostsAnalyticsDashboard
      initialData={data}
      pageKey={pageKey}
      highlightPostId={params.postId ?? null}
      highlightPost={highlightPost}
    />
  )
}
