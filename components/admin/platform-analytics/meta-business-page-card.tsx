import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  formatMetaMetricDisplay,
  liveText,
} from "@/lib/platform-analytics/format"
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
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "ok" | "warn" | "neutral"
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <span>{label}</span>
      <span
        className={cn(
          tone === "ok" && "text-green-700 dark:text-green-400",
          tone === "warn" && "text-amber-700 dark:text-amber-300",
          tone === "neutral" && "text-muted-foreground"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function capabilityTone(status: string): "ok" | "warn" | "neutral" {
  if (status === "Available" || status === "Connected" || status === "OK") {
    return "ok"
  }
  if (
    status === "Permission required" ||
    status === "Sync failed" ||
    status === "Expired" ||
    status === "Missing"
  ) {
    return "warn"
  }
  return "neutral"
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
        <CardTitle className="text-2xl leading-tight tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function syncStatusTone(status: string): "ok" | "warn" | "neutral" {
  if (status === "Success") return "ok"
  if (status === "Failed") return "warn"
  return "neutral"
}

export function MetaBusinessPageCard({ page }: MetaBusinessPageCardProps) {
  const connected = page.connectionStatus === "Connected"
  const m = page.metrics

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
            {page.pageName ? (
              <p className="text-sm text-muted-foreground">
                Facebook page name: <strong>{page.pageName}</strong>
              </p>
            ) : null}
            {page.tokenResolutionHint ? (
              <p className="text-sm text-muted-foreground">{page.tokenResolutionHint}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Badge variant={connected ? "default" : "neutral"}>
                Status: {page.connectionStatus}
              </Badge>
              <Badge variant="neutral">
                Facebook Page: {page.facebookPageStatus}
              </Badge>
              <Badge variant="neutral">
                Instagram Account: {page.instagramStatus}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatusPill
            label="Page access token"
            value={page.pageAccessTokenStatus}
            tone={page.pageAccessTokenStatus === "OK" ? "ok" : "warn"}
          />
          <StatusPill
            label="Last sync"
            value={
              page.lastSyncAt
                ? dateFormatter.format(new Date(page.lastSyncAt))
                : "Never"
            }
          />
          <StatusPill
            label="Posts sync"
            value={page.postsSyncStatus}
            tone={syncStatusTone(page.postsSyncStatus)}
          />
          <StatusPill
            label="Insights sync"
            value={page.insightsSyncStatus}
            tone={syncStatusTone(page.insightsSyncStatus)}
          />
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="mb-3 text-sm font-semibold">Permission &amp; capability status</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <StatusPill
              label="Page access token"
              value={page.permissions.pageAccessToken}
              tone={capabilityTone(page.permissions.pageAccessToken)}
            />
            <StatusPill
              label="Page summary"
              value={page.permissions.pageSummary}
              tone={capabilityTone(page.permissions.pageSummary)}
            />
            <StatusPill
              label="Posts"
              value={page.permissions.posts}
              tone={capabilityTone(page.permissions.posts)}
            />
            <StatusPill
              label="Insights"
              value={page.permissions.insights}
              tone={capabilityTone(page.permissions.insights)}
            />
            <StatusPill
              label="Webhooks"
              value={page.permissions.webhooks}
              tone={capabilityTone(page.permissions.webhooks)}
            />
            <StatusPill
              label="Ads"
              value={page.permissions.ads}
              tone="neutral"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        <section className="space-y-4">
          <h3 className="text-base font-semibold">Metrics</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total followers"
              value={formatMetaMetricDisplay(
                m.totalFollowers,
                m.states.totalFollowers
              )}
            />
            <MetricCard
              label="Facebook page likes"
              value={formatMetaMetricDisplay(m.pageLikes, m.states.pageLikes)}
            />
            <MetricCard
              label="New followers"
              value={formatMetaMetricDisplay(
                m.newFollowers,
                m.states.newFollowers
              )}
            />
            <MetricCard
              label="New likes"
              value={formatMetaMetricDisplay(m.newLikes, m.states.newLikes)}
            />
            <MetricCard
              label="Post engagements"
              value={formatMetaMetricDisplay(
                m.postEngagements,
                m.states.postEngagements
              )}
            />
            <MetricCard
              label="Reactions"
              value={formatMetaMetricDisplay(m.reactions, m.states.reactions)}
            />
            <MetricCard
              label="Comments"
              value={formatMetaMetricDisplay(m.comments, m.states.comments)}
            />
            <MetricCard
              label="Shares"
              value={formatMetaMetricDisplay(m.shares, m.states.shares)}
            />
            <MetricCard
              label="Reach"
              value={formatMetaMetricDisplay(m.reach, m.states.reach)}
            />
            <MetricCard
              label="Impressions"
              value={formatMetaMetricDisplay(m.impressions, m.states.impressions)}
            />
            <MetricCard
              label="Profile visits"
              value={formatMetaMetricDisplay(
                m.profileVisits,
                m.states.profileVisits
              )}
            />
            <MetricCard
              label="Link clicks"
              value={formatMetaMetricDisplay(m.linkClicks, m.states.linkClicks)}
            />
            <MetricCard
              label="Top performing post"
              value={
                m.states.topPerformingPost === "permission"
                  ? "Unavailable from current permission"
                  : m.states.topPerformingPost === "sync_failed"
                    ? "Sync failed"
                    : m.topPerformingPost
                      ? liveText(m.topPerformingPost)
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
          {page.postsUnavailableMessage ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
              {page.postsUnavailableMessage}
            </p>
          ) : null}
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
                      {page.postsUnavailableMessage
                        ? "Posts could not be loaded."
                        : page.postsSyncStatus === "Failed"
                          ? "Sync failed — check token permissions and try Sync Posts again."
                          : "No live data yet — run Sync Posts after connecting this page."}
                    </td>
                  </tr>
                ) : (
                  page.allPosts.map((post) => (
                    <tr key={post.id} className="border-b align-top">
                      <td className="whitespace-nowrap py-3 pr-4">
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

        <section className="space-y-4">
          <h3 className="text-base font-semibold">Sync history</h3>
          <ScrollArea className="w-full" scrollbars="horizontal">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Job</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Records</th>
                  <th className="py-2 pr-4">Started</th>
                  <th className="py-2 pr-4">Error</th>
                </tr>
              </thead>
              <tbody>
                {page.recentSyncRuns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-muted-foreground">
                      No sync runs yet.
                    </td>
                  </tr>
                ) : (
                  page.recentSyncRuns.map((run) => (
                    <tr key={run.id} className="border-b align-top">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {run.sync_type}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {run.records_affected}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {dateFormatter.format(new Date(run.started_at))}
                      </td>
                      <td className="max-w-sm py-2 pr-4 text-destructive">
                        {run.error_log ?? "—"}
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
