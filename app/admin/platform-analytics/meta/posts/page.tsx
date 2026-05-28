import Link from "next/link"

import { MetaPostsAnalyticsDashboard } from "@/components/admin/platform-analytics/meta/meta-posts-analytics-dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  getMetaPostByPostId,
  getMetaPostsPageData,
} from "@/lib/meta/posts-analytics"
import {
  getConfiguredMetaPages,
  getMetaPageByKey,
} from "@/lib/meta/pages-config"
import type { MetaPageConfigKey } from "@/lib/meta/pages-config"
import { requirePermission } from "@/lib/permissions"

export const metadata = {
  title: "Meta Posts Analytics",
  description: "Facebook post-level analytics per enabled Meta business page.",
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

function parsePageKey(
  value: string | undefined,
  fallback: MetaPageConfigKey
): MetaPageConfigKey {
  const candidate = (value ?? "").trim()
  if (candidate && getMetaPageByKey(candidate)) {
    return candidate
  }
  return fallback
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
  const activePages = getConfiguredMetaPages()
  const fallbackKey = activePages[0]?.key ?? "default"
  const pageKey = parsePageKey(params.pageKey, fallbackKey)

  if (activePages.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No Meta business pages are configured. Set{" "}
          <code className="text-xs">PRO_GROUP_META_ENABLED=true</code> (or another
          brand) with matching Page ID and Page Access Token.
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
    <div className="space-y-4">
      {activePages.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Branch:</span>
          {activePages.map((page) => (
            <Button
              key={page.key}
              type="button"
              size="sm"
              variant={page.key === pageKey ? "default" : "neutral"}
              asChild
            >
              <Link href={`/admin/platform-analytics/meta/posts?pageKey=${page.key}`}>
                {page.displayName}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}
      <MetaPostsAnalyticsDashboard
        initialData={data}
        pageKey={pageKey}
        highlightPostId={params.postId ?? null}
        highlightPost={highlightPost}
      />
    </div>
  )
}
