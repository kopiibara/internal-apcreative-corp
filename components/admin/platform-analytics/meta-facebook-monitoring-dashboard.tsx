"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  bootstrapMetaMonitoringAction,
  fetchMetaMonitoringAction,
  syncAllMetaMonitoringAction,
  triggerMetaSyncAction,
} from "@/app/admin/platform-analytics/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { MetaMonitoringDashboardData } from "@/lib/meta/monitoring-data"

type MetaFacebookMonitoringDashboardProps = {
  initialData: MetaMonitoringDashboardData
  canManage: boolean
  bootstrapMessage?: string | null
}

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—"
  }
  return value.toLocaleString("en-PH")
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardHeader>
    </Card>
  )
}

function getPostInsight(
  insights: Record<string, unknown> | null | undefined,
  key: string
) {
  const parsed = insights?.parsed as Record<string, number> | undefined
  if (!parsed) {
    return null
  }
  return parsed[key] ?? null
}

export function MetaFacebookMonitoringDashboard({
  initialData,
  canManage,
  bootstrapMessage,
}: MetaFacebookMonitoringDashboardProps) {
  const [data, setData] = useState(initialData)
  const [selectedPageId, setSelectedPageId] = useState<string>(
    initialData.pages[0]?.facebook_page_id ?? "all"
  )
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (bootstrapMessage) {
      if (bootstrapMessage.includes("failed") || bootstrapMessage.includes("Failed")) {
        toast.error(bootstrapMessage)
      } else {
        toast.message(bootstrapMessage)
      }
    }
  }, [bootstrapMessage])

  function reload(pageId?: string) {
    startTransition(async () => {
      const result = await fetchMetaMonitoringAction({
        pageId: pageId && pageId !== "all" ? pageId : null,
      })

      if (!result.success || !result.data) {
        toast.error(result.message)
        return
      }

      setData(result.data)
    })
  }

  function handlePageChange(value: string) {
    setSelectedPageId(value)
    reload(value)
  }

  function handleSync(syncType: "hourly_posts" | "daily_page") {
    startTransition(async () => {
      const result = await triggerMetaSyncAction(syncType)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      reload(selectedPageId)
    })
  }

  function handleBootstrap() {
    startTransition(async () => {
      const result = await bootstrapMetaMonitoringAction()
      if (!result.success) {
        toast.error(result.message)
        if (result.data?.warnings?.length) {
          toast.error(result.data.warnings.join(" "))
        }
        return
      }
      toast.success(result.message)
      if (result.data?.warnings?.length) {
        toast.warning(result.data.warnings.join(" "))
      }
      reload(selectedPageId)
    })
  }

  function handleSyncAll() {
    startTransition(async () => {
      const result = await syncAllMetaMonitoringAction()
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      reload(selectedPageId)
    })
  }

  const { socialMonitoring, pageAnalytics, integrationStatus } = data
  const { pageInsights } = pageAnalytics

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            Platform Analytics
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Facebook Page analytics from Graph API sync plus real-time webhook
            activity (comments, feed, mentions).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedPageId} onValueChange={handlePageChange}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="All pages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All connected pages</SelectItem>
              {data.pages.map((page) => (
                <SelectItem
                  key={page.facebook_page_id}
                  value={page.facebook_page_id}
                >
                  {page.page_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage ? (
            <>
              <Button
                type="button"
                variant="default"
                disabled={isPending}
                onClick={handleBootstrap}
              >
                Connect &amp; sync
              </Button>
              <Button
                type="button"
                variant="neutral"
                disabled={isPending}
                onClick={handleSyncAll}
              >
                Sync all
              </Button>
              <Button
                type="button"
                variant="neutral"
                disabled={isPending}
                onClick={() => handleSync("hourly_posts")}
              >
                Sync posts
              </Button>
              <Button
                type="button"
                variant="neutral"
                disabled={isPending}
                onClick={() => handleSync("daily_page")}
              >
                Sync page totals
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meta connection status</CardTitle>
          <CardDescription>
            Webhooks deliver live activity. Followers, likes, posts, and insights
            require a Page access token and sync.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusRow
              label="Webhook (verify token + app secret)"
              ok={integrationStatus.webhookConfigured}
            />
            <StatusRow
              label="Graph API (page access token)"
              ok={integrationStatus.graphTokenConfigured}
            />
            <StatusRow
              label="Cron secret (scheduled jobs)"
              ok={integrationStatus.cronConfigured}
            />
            <StatusRow
              label="Connected pages"
              ok={integrationStatus.connectedPageCount > 0}
              detail={String(integrationStatus.connectedPageCount)}
            />
          </div>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <span>Webhook events: {integrationStatus.webhookEventCount}</span>
            <span>Daily snapshots: {integrationStatus.snapshotCount}</span>
            <span>Synced posts: {integrationStatus.postMetricsCount}</span>
          </div>
          {integrationStatus.lastSyncError ? (
            <p className="mt-3 text-sm text-destructive">
              Last sync error: {integrationStatus.lastSyncError}
            </p>
          ) : null}
          {integrationStatus.lastSyncAt ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Last sync: {dateFormatter.format(new Date(integrationStatus.lastSyncAt))}
            </p>
          ) : null}
          {integrationStatus.needsBootstrap && canManage ? (
            <p className="mt-3 text-sm">
              No analytics data yet. Click <strong>Connect &amp; sync</strong> after
              setting <code className="text-xs">META_PAGE_ACCESS_TOKEN</code> in
              production (Vercel).
            </p>
          ) : null}
        </CardContent>
      </Card>

      {data.pages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.pages.map((page) => (
            <Card key={page.facebook_page_id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{page.page_name}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {page.facebook_page_id}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  Webhook fields:{" "}
                  {page.webhook_subscribed_fields.join(", ") || "feed"}
                </p>
                <p className="mt-1">
                  Last synced:{" "}
                  {page.last_synced_at
                    ? dateFormatter.format(new Date(page.last_synced_at))
                    : "Never"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="social">Social Monitoring</TabsTrigger>
          <TabsTrigger value="analytics">Page Analytics</TabsTrigger>
          <TabsTrigger value="insights">Page Insights</TabsTrigger>
          <TabsTrigger value="posts">Post Performance</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="sync">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total followers"
              value={formatNumber(pageAnalytics.totalFollowers)}
            />
            <MetricCard
              label="Page likes (fans)"
              value={formatNumber(pageAnalytics.pageLikes)}
            />
            <MetricCard
              label="New followers (vs prior day)"
              value={formatNumber(pageAnalytics.newFollowers)}
            />
            <MetricCard
              label="Post engagements (synced)"
              value={formatNumber(
                pageAnalytics.totalReactions +
                  pageAnalytics.totalComments +
                  pageAnalytics.totalShares
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Reactions on posts"
              value={formatNumber(pageAnalytics.totalReactions)}
            />
            <MetricCard
              label="Comments on posts"
              value={formatNumber(pageAnalytics.totalComments)}
            />
            <MetricCard
              label="Shares on posts"
              value={formatNumber(pageAnalytics.totalShares)}
            />
            <MetricCard
              label="Comments (24h webhook)"
              value={socialMonitoring.newComments}
            />
            <MetricCard
              label="Reactions (24h webhook)"
              value={socialMonitoring.newReactions}
            />
          </div>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="New comments (24h)"
              value={socialMonitoring.newComments}
            />
            <MetricCard
              label="New reactions (24h)"
              value={socialMonitoring.newReactions}
            />
            <MetricCard
              label="New mentions (24h)"
              value={socialMonitoring.newMentions}
            />
            <MetricCard
              label="New messages (24h)"
              value={socialMonitoring.newMessages}
            />
            <MetricCard
              label="New leads (24h)"
              value={socialMonitoring.newLeads}
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total followers"
              value={formatNumber(pageAnalytics.totalFollowers)}
            />
            <MetricCard
              label="Page likes"
              value={formatNumber(pageAnalytics.pageLikes)}
            />
            <MetricCard
              label="New followers (vs prior day)"
              value={formatNumber(pageAnalytics.newFollowers)}
            />
            <MetricCard
              label="Total shares (synced posts)"
              value={formatNumber(pageAnalytics.totalShares)}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Daily growth snapshots</CardTitle>
              <CardDescription>
                Follower and Page totals captured by the daily sync job.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full" scrollbars="horizontal">
                <div className="min-w-[720px]">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Followers</th>
                        <th className="py-2 pr-4">Page likes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageAnalytics.growthSnapshots.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-6 text-muted-foreground"
                          >
                            No snapshots yet. Run Connect &amp; sync or daily
                            sync after setting META_PAGE_ACCESS_TOKEN.
                          </td>
                        </tr>
                      ) : (
                        pageAnalytics.growthSnapshots.map((row) => (
                          <tr key={row.id} className="border-b">
                            <td className="py-2 pr-4">{row.snapshot_date}</td>
                            <td className="py-2 pr-4">
                              {formatNumber(row.followers_count)}
                            </td>
                            <td className="py-2 pr-4">
                              {formatNumber(row.page_likes)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Page impressions (day)"
              value={formatNumber(pageInsights.pageImpressions)}
            />
            <MetricCard
              label="Unique impressions (day)"
              value={formatNumber(pageInsights.pageImpressionsUnique)}
            />
            <MetricCard
              label="Engaged users (day)"
              value={formatNumber(pageInsights.pageEngagedUsers)}
            />
            <MetricCard
              label="Post engagements (day)"
              value={formatNumber(pageInsights.pagePostEngagements)}
            />
            <MetricCard
              label="Page views (day)"
              value={formatNumber(pageInsights.pageViewsTotal)}
            />
            <MetricCard
              label="New fans (day)"
              value={formatNumber(pageInsights.pageFanAdds)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Insights come from Meta Page Insights API on daily sync. Some metrics
            require <code className="text-xs">read_insights</code> and may show — if
            Meta returns no data for your Page.
          </p>
        </TabsContent>

        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle>Post performance</CardTitle>
              <CardDescription>
                Reactions, comments, shares, engagement rate, and post insights
                from Graph API sync.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full" scrollbars="horizontal">
                <div className="min-w-[1200px]">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Rank</th>
                        <th className="py-2 pr-4">Caption</th>
                        <th className="py-2 pr-4">Published</th>
                        <th className="py-2 pr-4">Reactions</th>
                        <th className="py-2 pr-4">Comments</th>
                        <th className="py-2 pr-4">Shares</th>
                        <th className="py-2 pr-4">Engagement</th>
                        <th className="py-2 pr-4">Impressions</th>
                        <th className="py-2 pr-4">Engaged</th>
                        <th className="py-2 pr-4">Clicks</th>
                        <th className="py-2 pr-4">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topPosts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="py-6 text-muted-foreground"
                          >
                            No synced posts yet. Run Connect &amp; sync or Sync
                            posts.
                          </td>
                        </tr>
                      ) : (
                        data.topPosts.map((post) => (
                          <tr key={post.id} className="border-b align-top">
                            <td className="py-2 pr-4">
                              {post.performance_rank ?? "—"}
                            </td>
                            <td className="max-w-xs py-2 pr-4">
                              <p className="line-clamp-2">
                                {post.message || "Untitled post"}
                              </p>
                            </td>
                            <td className="py-2 pr-4">
                              {post.published_at
                                ? dateFormatter.format(
                                    new Date(post.published_at)
                                  )
                                : "—"}
                            </td>
                            <td className="py-2 pr-4">
                              {post.reactions_count}
                            </td>
                            <td className="py-2 pr-4">
                              {post.comments_count}
                            </td>
                            <td className="py-2 pr-4">{post.shares_count}</td>
                            <td className="py-2 pr-4">
                              {post.engagement_rate ?? "—"}
                            </td>
                            <td className="py-2 pr-4">
                              {formatNumber(
                                getPostInsight(
                                  post.insights as Record<string, unknown>,
                                  "post_impressions"
                                )
                              )}
                            </td>
                            <td className="py-2 pr-4">
                              {formatNumber(
                                getPostInsight(
                                  post.insights as Record<string, unknown>,
                                  "post_engaged_users"
                                )
                              )}
                            </td>
                            <td className="py-2 pr-4">
                              {formatNumber(
                                getPostInsight(
                                  post.insights as Record<string, unknown>,
                                  "post_clicks"
                                )
                              )}
                            </td>
                            <td className="py-2 pr-4">
                              {post.permalink ? (
                                <a
                                  href={post.permalink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline"
                                >
                                  Open
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Webhook activity logs</CardTitle>
              <CardDescription>
                Real-time events from Meta webhooks (feed, comments, etc.).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[480px] w-full">
                <div className="space-y-3 pr-4">
                  {data.recentEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No webhook events yet. Verify webhook in Meta Developer and
                      comment on a Page post to test.
                    </p>
                  ) : (
                    data.recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={event.processing_status} />
                          <span className="font-medium">
                            {event.event_type ?? event.field_name ?? "event"}
                          </span>
                          <span className="text-muted-foreground">
                            {dateFormatter.format(new Date(event.received_at))}
                          </span>
                        </div>
                        <p className="mt-2 text-muted-foreground">
                          Page: {event.page_id ?? "—"} · Post:{" "}
                          {event.post_id ?? "—"} · Comment:{" "}
                          {event.comment_id ?? "—"}
                        </p>
                        {event.error_log ? (
                          <p className="mt-2 text-destructive">
                            {event.error_log}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle>Sync history</CardTitle>
              <CardDescription>
                Recent Graph API sync jobs (posts and daily page totals).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full" scrollbars="horizontal">
                <div className="min-w-[720px]">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Started</th>
                        <th className="py-2 pr-4">Job</th>
                        <th className="py-2 pr-4">Page</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Records</th>
                        <th className="py-2 pr-4">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSyncRuns.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-6 text-muted-foreground"
                          >
                            No sync runs yet.
                          </td>
                        </tr>
                      ) : (
                        data.recentSyncRuns.map((run) => (
                          <tr key={run.id} className="border-b">
                            <td className="py-2 pr-4">
                              {dateFormatter.format(new Date(run.started_at))}
                            </td>
                            <td className="py-2 pr-4">{run.sync_type}</td>
                            <td className="py-2 pr-4 font-mono text-xs">
                              {run.facebook_page_id ?? "all"}
                            </td>
                            <td className="py-2 pr-4">
                              <StatusBadge status={run.status} />
                            </td>
                            <td className="py-2 pr-4">
                              {run.records_affected}
                            </td>
                            <td className="max-w-xs py-2 pr-4 text-destructive">
                              {run.error_log ?? "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {data.pages.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No Facebook Pages connected</CardTitle>
            <CardDescription>
              Set META_PAGE_ACCESS_TOKEN in Vercel, then click Connect &amp; sync
              (requires meta_monitoring.manage). See docs/meta-environment-variables.md.
            </CardDescription>
          </CardHeader>
          {canManage ? (
            <CardContent>
              <Button
                type="button"
                disabled={isPending}
                onClick={handleBootstrap}
              >
                Connect &amp; sync Facebook Page
              </Button>
            </CardContent>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}

function StatusRow({
  label,
  ok,
  detail,
}: {
  label: string
  ok: boolean
  detail?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <span>{label}</span>
      <span className={ok ? "text-green-700" : "text-amber-700"}>
        {detail ?? (ok ? "OK" : "Missing")}
      </span>
    </div>
  )
}
