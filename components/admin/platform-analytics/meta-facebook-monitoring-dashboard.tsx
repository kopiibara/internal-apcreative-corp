"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  fetchMetaMonitoringAction,
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
}

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

function MetricCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

export function MetaFacebookMonitoringDashboard({
  initialData,
  canManage,
}: MetaFacebookMonitoringDashboardProps) {
  const [data, setData] = useState(initialData)
  const [selectedPageId, setSelectedPageId] = useState<string>(
    initialData.pages[0]?.facebook_page_id ?? "all"
  )
  const [isPending, startTransition] = useTransition()

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

  const { socialMonitoring, pageAnalytics } = data

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            Platform Analytics
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Real-time Platform Analytics combined with scheduled Graph API sync for
            engagement, analytics, and activity logs.
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

      <Tabs defaultValue="social">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="social">Social Monitoring</TabsTrigger>
          <TabsTrigger value="analytics">Page Analytics</TabsTrigger>
          <TabsTrigger value="posts">Post Performance</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

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
              value={pageAnalytics.totalFollowers ?? "—"}
            />
            <MetricCard
              label="New followers (vs prior day)"
              value={pageAnalytics.newFollowers ?? "—"}
            />
            <MetricCard
              label="Total reactions (synced posts)"
              value={pageAnalytics.totalReactions}
            />
            <MetricCard
              label="Total comments (synced posts)"
              value={pageAnalytics.totalComments}
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
                            No snapshots yet. Run the daily sync after
                            connecting a Page.
                          </td>
                        </tr>
                      ) : (
                        pageAnalytics.growthSnapshots.map((row) => (
                          <tr key={row.id} className="border-b">
                            <td className="py-2 pr-4">{row.snapshot_date}</td>
                            <td className="py-2 pr-4">
                              {row.followers_count ?? "—"}
                            </td>
                            <td className="py-2 pr-4">
                              {row.page_likes ?? "—"}
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

        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle>Post performance</CardTitle>
              <CardDescription>
                Ranked by reactions, comments, and shares from Graph API sync.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full" scrollbars="horizontal">
                <div className="min-w-[960px]">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Rank</th>
                        <th className="py-2 pr-4">Caption</th>
                        <th className="py-2 pr-4">Published</th>
                        <th className="py-2 pr-4">Reactions</th>
                        <th className="py-2 pr-4">Comments</th>
                        <th className="py-2 pr-4">Shares</th>
                        <th className="py-2 pr-4">Engagement rate</th>
                        <th className="py-2 pr-4">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topPosts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-6 text-muted-foreground"
                          >
                            No synced posts yet.
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
                Raw Meta payloads are stored for audit and debugging.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[480px] w-full">
                <div className="space-y-3 pr-4">
                  {data.recentEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No webhook events received yet.
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
      </Tabs>

      {data.pages.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No Facebook Pages connected</CardTitle>
            <CardDescription>
              Register a Page in the database and configure Meta webhook
              subscription in the Developer Dashboard. See docs/meta-facebook-integration.md.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  )
}
