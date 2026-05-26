import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatMetaMetricValue } from "@/lib/platform-analytics/format"
import type { MetaBusinessPageDashboard } from "@/lib/platform-analytics/types"
import { cn } from "@/lib/utils"

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

type MetaBusinessPageCardProps = {
  page: MetaBusinessPageDashboard
}

function StatusPill({
  label,
  ok,
}: {
  label: string
  ok: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <span>{label}</span>
      <span
        className={cn(
          ok
            ? "text-green-700 dark:text-green-400"
            : "text-amber-700 dark:text-amber-300"
        )}
      >
        {ok ? "OK" : "Missing / pending"}
      </span>
    </div>
  )
}

function MetricCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <Card className="border-border/80 bg-background/60">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums leading-tight">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

export function MetaBusinessPageCard({ page }: MetaBusinessPageCardProps) {
  const insightsUnavailable = page.insights.insightsUnavailable
  const connected = page.connectionStatus === "Connected"

  return (
    <Card className="border-2 border-border bg-card/80 shadow-sm">
      <CardHeader className="space-y-4 border-b border-border/80 pb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl">{page.displayName}</CardTitle>
            <CardDescription>
              Platform: {page.platformLabel}
              {page.facebookPageId ? (
                <span className="ml-2 font-mono text-xs">
                  · Page ID {page.facebookPageId}
                </span>
              ) : null}
            </CardDescription>
            <div className="flex flex-wrap gap-2">
              <Badge variant={connected ? "default" : "neutral"}>
                Status: {page.connectionStatus}
              </Badge>
              <Badge variant="neutral">Facebook Page: {page.facebookPageStatus}</Badge>
              <Badge variant="neutral">
                Instagram Account: {page.instagramStatus}
              </Badge>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              Last sync:{" "}
              {page.lastSyncAt
                ? dateFormatter.format(new Date(page.lastSyncAt))
                : "Never"}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <StatusPill
            label="Page access token"
            ok={page.pageAccessTokenStatus === "OK"}
          />
          <StatusPill label="Cron" ok={page.cronStatus === "OK"} />
          <StatusPill label="Facebook page" ok={page.facebookPageStatus === "Connected"} />
        </div>
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        <section className="space-y-4">
          <h3 className="text-base font-semibold">Metrics</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total followers"
              value={formatMetaMetricValue(page.metrics.totalFollowers)}
            />
            <MetricCard
              label="Facebook page likes"
              value={formatMetaMetricValue(page.metrics.pageLikes)}
            />
            <MetricCard
              label="New followers"
              value={formatMetaMetricValue(page.metrics.newFollowers)}
            />
            <MetricCard
              label="New likes"
              value={formatMetaMetricValue(page.metrics.newLikes)}
            />
            <MetricCard
              label="Post engagements"
              value={formatMetaMetricValue(page.metrics.postEngagements)}
            />
            <MetricCard
              label="Reactions"
              value={formatMetaMetricValue(page.metrics.reactions)}
            />
            <MetricCard
              label="Comments"
              value={formatMetaMetricValue(page.metrics.comments)}
            />
            <MetricCard
              label="Shares"
              value={formatMetaMetricValue(page.metrics.shares)}
            />
            <MetricCard
              label="Reach"
              value={formatMetaMetricValue(page.metrics.reach, {
                unavailable: insightsUnavailable && page.metrics.reach === null,
              })}
            />
            <MetricCard
              label="Impressions"
              value={formatMetaMetricValue(page.metrics.impressions, {
                unavailable:
                  insightsUnavailable && page.metrics.impressions === null,
              })}
            />
            <MetricCard
              label="Profile visits"
              value={formatMetaMetricValue(page.metrics.profileVisits, {
                unavailable:
                  insightsUnavailable && page.metrics.profileVisits === null,
              })}
            />
            <MetricCard
              label="Link clicks"
              value={
                page.metrics.linkClicks === null
                  ? "No live data yet"
                  : formatMetaMetricValue(page.metrics.linkClicks)
              }
            />
            <MetricCard
              label="Top performing post"
              value={
                page.metrics.topPerformingPost
                  ? page.metrics.topPerformingPost
                  : "No live data yet"
              }
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">All posts</h3>
            <p className="text-sm text-muted-foreground">
              Facebook posts synced for {page.displayName}.
            </p>
          </div>
          <ScrollArea className="w-full" scrollbars="horizontal">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Post preview</th>
                  <th className="py-2 pr-4">Caption</th>
                  <th className="py-2 pr-4">Reactions</th>
                  <th className="py-2 pr-4">Comments</th>
                  <th className="py-2 pr-4">Shares</th>
                  <th className="py-2 pr-4">Engagement</th>
                  <th className="py-2 pr-4">Post link</th>
                </tr>
              </thead>
              <tbody>
                {page.allPosts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-muted-foreground">
                      No live data yet — run sync after connecting this page.
                    </td>
                  </tr>
                ) : (
                  page.allPosts.map((post) => (
                    <tr key={post.id} className="border-b align-top">
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {post.publishedAt
                          ? dateFormatter.format(new Date(post.publishedAt))
                          : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {post.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.imageUrl}
                            alt=""
                            className="h-16 w-16 rounded-md border bg-muted object-cover"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="max-w-xs py-3 pr-4">
                        <span className="line-clamp-3">
                          {post.message || "Untitled post"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{post.reactions}</td>
                      <td className="py-3 pr-4 tabular-nums">{post.comments}</td>
                      <td className="py-3 pr-4 tabular-nums">{post.shares}</td>
                      <td className="py-3 pr-4 tabular-nums">
                        {post.engagementTotal}
                      </td>
                      <td className="py-3 pr-4">
                        {post.permalink ? (
                          <a
                            href={post.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-4 hover:underline"
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
          </ScrollArea>
        </section>
      </CardContent>
    </Card>
  )
}
