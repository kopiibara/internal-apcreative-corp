import "server-only";

import Link from "next/link";

import { MetaPostsAnalyticsDashboard } from "@/components/admin/platform-analytics/meta/meta-posts-analytics-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getMetaPostByPostId,
  getMetaPostsPageData,
} from "@/lib/meta/posts-analytics";
import {
  getPlatformAnalyticsBrandScope,
  isMetaPageKeyAllowed,
} from "@/lib/platform-analytics/brand-scope";
import {
  getConfiguredMetaPages,
  getMetaPageByKey,
  type MetaPageConfigKey,
} from "@/lib/meta/pages-config";
import { requirePlatformAnalyticsView } from "@/lib/platform-analytics/access";

type MetaPostsSearchParams = {
  pageKey?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  postId?: string;
};

type MetaPostsPageOptions = {
  analyticsBasePath: string;
  searchParams: MetaPostsSearchParams;
};

function parsePageKey(
  value: string | undefined,
  fallback: MetaPageConfigKey,
): MetaPageConfigKey {
  const candidate = (value ?? "").trim();
  if (candidate && getMetaPageByKey(candidate)) {
    return candidate;
  }
  return fallback;
}

function parsePageSize(value: string | undefined): 10 | 25 | 50 {
  const parsed = Number(value);
  if (parsed === 25 || parsed === 50) {
    return parsed;
  }
  return 10;
}

export async function renderMetaPostsAnalyticsPage({
  analyticsBasePath,
  searchParams,
}: MetaPostsPageOptions) {
  const context = await requirePlatformAnalyticsView();
  const brandScope = await getPlatformAnalyticsBrandScope(context.profile.id);
  const configuredPages = getConfiguredMetaPages();
  const activePages = configuredPages.filter((page) =>
    isMetaPageKeyAllowed(page.key, brandScope),
  );
  const fallbackKey = activePages[0]?.key ?? configuredPages[0]?.key ?? "default";
  const requestedPageKey = parsePageKey(searchParams.pageKey, fallbackKey);
  const pageKey = activePages.some((page) => page.key === requestedPageKey)
    ? requestedPageKey
    : fallbackKey;

  if (activePages.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No Meta business pages are available for your assigned brands.
        </CardContent>
      </Card>
    );
  }

  const data = await getMetaPostsPageData({
    pageKey,
    page: Math.max(1, Number(searchParams.page) || 1),
    pageSize: parsePageSize(searchParams.pageSize),
    sort:
      searchParams.sort === "highest_engagement" ||
      searchParams.sort === "most_comments" ||
      searchParams.sort === "most_shares" ||
      searchParams.sort === "most_reactions"
        ? searchParams.sort
        : "latest",
    search: searchParams.search,
    dateFrom: searchParams.dateFrom ?? null,
    dateTo: searchParams.dateTo ?? null,
  });

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Meta posts analytics is not available for this page configuration.
        </CardContent>
      </Card>
    );
  }

  const highlightPost = searchParams.postId
    ? await getMetaPostByPostId(pageKey, searchParams.postId)
    : null;

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
              <Link
                href={`${analyticsBasePath}/meta/posts?pageKey=${page.key}`}
              >
                {page.displayName}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}
      <MetaPostsAnalyticsDashboard
        initialData={data}
        pageKey={pageKey}
        highlightPostId={searchParams.postId ?? null}
        highlightPost={highlightPost}
        analyticsBasePath={analyticsBasePath}
      />
    </div>
  );
}
