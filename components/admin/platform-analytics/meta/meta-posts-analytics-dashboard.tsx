"use client"

import Link from "next/link"
import { useCallback, useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { fetchMetaPostsAction } from "@/app/admin/platform-analytics/actions"
import { MetaPostCommentsSheet } from "@/components/admin/platform-analytics/meta/meta-post-comments-sheet"
import {
  MetaPostCaption,
  MetaPostDate,
  MetaPostExternalLink,
  MetaPostThumbnail,
} from "@/components/admin/platform-analytics/meta/meta-post-shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatRecentOrDateTime } from "@/lib/date-time/relative-timestamp"
import type { MetaPostsPageData } from "@/lib/meta/posts-analytics"
import type { MetaBusinessPagePostRow } from "@/lib/meta/page-analytics-types"
import type { MetaPageConfigKey } from "@/lib/meta/pages-config"
import type { MetaPostsSort } from "@/lib/meta/posts-analytics"

type MetaPostsAnalyticsDashboardProps = {
  initialData: MetaPostsPageData
  pageKey: MetaPageConfigKey
  highlightPostId?: string | null
  highlightPost?: MetaBusinessPagePostRow | null
  analyticsBasePath?: string
}

const SORT_OPTIONS: Array<{ value: MetaPostsSort; label: string }> = [
  { value: "latest", label: "Latest" },
  { value: "highest_engagement", label: "Highest engagement" },
  { value: "most_comments", label: "Most comments" },
  { value: "most_shares", label: "Most shares" },
  { value: "most_reactions", label: "Most reactions" },
]

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/80 bg-background/60">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle className="text-lg tabular-nums leading-tight sm:text-xl">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

export function MetaPostsAnalyticsDashboard({
  initialData,
  pageKey,
  highlightPostId,
  highlightPost,
  analyticsBasePath = "/admin/platform-analytics",
}: MetaPostsAnalyticsDashboardProps) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [sort, setSort] = useState<MetaPostsSort>("latest")
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10)
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [commentsPost, setCommentsPost] = useState<MetaBusinessPagePostRow | null>(
    null
  )
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const reload = useCallback(
    (overrides?: {
      page?: number
      pageSize?: 10 | 25 | 50
      sort?: MetaPostsSort
      search?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      startTransition(async () => {
        const nextPage = overrides?.page ?? page
        const nextPageSize = overrides?.pageSize ?? pageSize
        const nextSort = overrides?.sort ?? sort
        const nextSearch = overrides?.search ?? appliedSearch
        const nextFrom = overrides?.dateFrom ?? dateFrom
        const nextTo = overrides?.dateTo ?? dateTo

        const result = await fetchMetaPostsAction({
          pageKey,
          page: nextPage,
          pageSize: nextPageSize,
          sort: nextSort,
          search: nextSearch || undefined,
          dateFrom: nextFrom || null,
          dateTo: nextTo || null,
        })

        if (!result.success || !result.data) {
          toast.error(result.message)
          return
        }

        setData(result.data)
      })
    },
    [appliedSearch, dateFrom, dateTo, page, pageKey, pageSize, sort]
  )

  useEffect(() => {
    if (!highlightPostId) {
      return
    }

    const match =
      highlightPost ??
      data.posts.find((post) => post.postId === highlightPostId) ??
      null

    if (match) {
      setCommentsPost(match)
      setCommentsOpen(true)
    }
  }, [highlightPost, highlightPostId, data.posts])

  const pageInfo = data.page
  const summary = data.summary

  function applyFilters() {
    setAppliedSearch(search.trim())
    setPage(1)
    reload({ page: 1, search: search.trim() })
  }

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="neutral" size="sm" asChild>
              <Link href={analyticsBasePath}>← Meta Analytics</Link>
            </Button>
            <Badge variant="neutral">Facebook Posts</Badge>
          </div>
          <h1 className="text-2xl font-semibold">Meta Posts Analytics</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {pageInfo.displayName} — detailed post-level performance, comments,
            and engagement.
          </p>
        </div>
      </header>

      <Card className="border-2 border-border bg-card/80">
        <CardHeader className="space-y-4 border-b border-border/80 pb-6">
          <div>
            <CardTitle className="text-xl">
              {pageInfo.displayName} — Facebook Posts
            </CardTitle>
            <CardDescription className="mt-2 space-y-1">
              <span className="block">
                {summary.totalPosts.toLocaleString("en-PH")} posts synced
              </span>
              {pageInfo.postPreview.lastPostsSyncAt ? (
                <span className="block">
                  Last posts sync:{" "}
                  {formatRecentOrDateTime(
                    pageInfo.postPreview.lastPostsSyncAt,
                    dateFormatter
                  )}
                </span>
              ) : null}
              {pageInfo.facebookPageId ? (
                <span className="block font-mono text-xs">
                  Page ID {pageInfo.facebookPageId}
                </span>
              ) : null}
              <span className="block">
                Connection: {pageInfo.connectionStatus}
              </span>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <SummaryCard
              label="Total posts synced"
              value={summary.totalPosts.toLocaleString("en-PH")}
            />
            <SummaryCard
              label="Total reactions"
              value={summary.totalReactions.toLocaleString("en-PH")}
            />
            <SummaryCard
              label="Total comments"
              value={summary.totalComments.toLocaleString("en-PH")}
            />
            <SummaryCard
              label="Total shares"
              value={summary.totalShares.toLocaleString("en-PH")}
            />
            <SummaryCard
              label="Total engagement"
              value={summary.totalEngagement.toLocaleString("en-PH")}
            />
            <SummaryCard
              label="Avg. engagement / post"
              value={summary.averageEngagementPerPost.toLocaleString("en-PH")}
            />
          </div>

          {summary.highestPerformingPost ? (
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">Highest performing post</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {summary.highestPerformingPost.message || "Untitled post"} ·{" "}
                {summary.highestPerformingPost.engagementTotal.toLocaleString(
                  "en-PH"
                )}{" "}
                engagement
              </p>
            </div>
          ) : null}

          <div className="space-y-4 rounded-lg border border-border/80 bg-muted/10 p-4">
            <h3 className="text-sm font-semibold">Filters</h3>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">From date</label>
                <DatePicker
                  value={dateFrom}
                  onChange={(value) => {
                    setDateFrom(value)
                    setPage(1)
                    reload({ page: 1, dateFrom: value })
                  }}
                  placeholder="From"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">To date</label>
                <DatePicker
                  value={dateTo}
                  onChange={(value) => {
                    setDateTo(value)
                    setPage(1)
                    reload({ page: 1, dateTo: value })
                  }}
                  placeholder="To"
                />
              </div>
              <div className="space-y-2 xl:col-span-2">
                <label className="text-xs text-muted-foreground">
                  Search caption
                </label>
                <div className="flex gap-2">
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search post caption…"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyFilters()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="default"
                    disabled={isPending}
                    onClick={applyFilters}
                  >
                    Search
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Sort by</label>
                <Select
                  value={sort}
                  onValueChange={(value) => {
                    const next = value as MetaPostsSort
                    setSort(next)
                    setPage(1)
                    reload({ page: 1, sort: next })
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Per page</label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    const next = Number(value) as 10 | 25 | 50
                    setPageSize(next)
                    setPage(1)
                    reload({ page: 1, pageSize: next })
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {data.postsUnavailableMessage && data.posts.length === 0 ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
              {data.postsUnavailableMessage}
            </p>
          ) : null}

          <ScrollArea className="w-full" scrollbars="horizontal">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Date posted</th>
                  <th className="py-2 pr-4">Preview</th>
                  <th className="py-2 pr-4">Caption</th>
                  <th className="py-2 pr-4">Reactions</th>
                  <th className="py-2 pr-4">Comments</th>
                  <th className="py-2 pr-4">Shares</th>
                  <th className="py-2 pr-4">Engagement</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Link</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.posts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-muted-foreground">
                      {isPending
                        ? "Loading…"
                        : "No posts match your filters."}
                    </td>
                  </tr>
                ) : (
                  data.posts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b align-top hover:bg-muted/20"
                    >
                      <td className="py-3 pr-4">
                        <MetaPostDate publishedAt={post.publishedAt} />
                      </td>
                      <td className="py-3 pr-4">
                        <MetaPostThumbnail post={post} />
                      </td>
                      <td className="max-w-xs py-3 pr-4">
                        <MetaPostCaption
                          message={post.message}
                          className="line-clamp-3"
                        />
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{post.reactions}</td>
                      <td className="py-3 pr-4 tabular-nums">{post.comments}</td>
                      <td className="py-3 pr-4 tabular-nums">{post.shares}</td>
                      <td className="py-3 pr-4 tabular-nums">
                        {post.engagementTotal}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {post.postType ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <MetaPostExternalLink
                          permalink={post.permalink}
                          label="View post"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="neutral"
                            size="sm"
                            onClick={() => {
                              setCommentsPost(post)
                              setCommentsOpen(true)
                            }}
                          >
                            View comments
                          </Button>
                          {post.permalink ? (
                            <Button
                              type="button"
                              variant="neutral"
                              size="sm"
                              asChild
                            >
                              <a
                                href={post.permalink}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open on Facebook
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollArea>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
              {data.pagination.totalItems.toLocaleString("en-PH")} posts
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="neutral"
                size="sm"
                disabled={isPending || data.pagination.page <= 1}
                onClick={() => {
                  const next = data.pagination.page - 1
                  setPage(next)
                  reload({ page: next })
                }}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                disabled={
                  isPending ||
                  data.pagination.page >= data.pagination.totalPages
                }
                onClick={() => {
                  const next = data.pagination.page + 1
                  setPage(next)
                  reload({ page: next })
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <MetaPostCommentsSheet
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        pageKey={pageKey}
        post={commentsPost}
      />
    </div>
  )
}
