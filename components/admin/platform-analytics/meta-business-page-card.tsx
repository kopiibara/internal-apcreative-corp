import Link from "next/link"

import {
  MetaPostCaption,
  MetaPostDate,
  MetaPostEngagementStats,
  MetaPostExternalLink,
  MetaPostThumbnail,
  MetaViewAllPostsButton,
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
import {
  formatMetaMetricDisplay,
  liveText,
} from "@/lib/platform-analytics/format"
import type { MetaMetricDisplayState } from "@/lib/platform-analytics/format"
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
  if (
    status === "Available" ||
    status === "Connected" ||
    status === "OK"
  ) {
    return "ok"
  }
  if (
    status === "Permission required" ||
    status === "Sync failed" ||
    status === "Expired" ||
    status === "Missing" ||
    status === "Invalid"
  ) {
    return "warn"
  }
  return "neutral"
}

function metricNote(state: MetaMetricDisplayState): string | null {
  if (state === "permission") {
    return "Unavailable from current permission"
  }
  if (state === "sync_failed") {
    return "Sync failed for this metric"
  }
  if (state === "no_data") {
    return "No live data yet"
  }
  return null
}

function MetricCard({
  label,
  value,
  state,
}: {
  label: string
  value: string | number
  state: MetaMetricDisplayState
}) {
  const note = metricNote(state)

  return (
    <Card className="border-2 border-border bg-background/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle className="text-xl leading-tight tabular-nums sm:text-2xl">
          {value}
        </CardTitle>
        {note ? (
          <p className="text-xs text-muted-foreground">{note}</p>
        ) : null}
      </CardHeader>
    </Card>
  )
}

function syncStatusTone(status: string): "ok" | "warn" | "neutral" {
  if (status === "Success") return "ok"
  if (status === "Failed") return "warn"
  return "neutral"
}

function PostPreviewCard({
  post,
  badge,
}: {
  post: MetaBusinessPageDashboard["postPreview"]["topPosts"][number]
  badge: string
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/80 bg-background/40 p-3">
      <MetaPostThumbnail post={post} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="text-[10px]">
            {badge}
          </Badge>
          <MetaPostDate publishedAt={post.publishedAt} />
        </div>
        <MetaPostCaption message={post.message} className="line-clamp-2 text-sm" />
        <MetaPostEngagementStats post={post} />
      </div>
    </div>
  )
}

export function MetaBusinessPageCard({ page }: MetaBusinessPageCardProps) {
  const connected = page.connectionStatus === "Connected"
  const m = page.metrics
  const preview = page.postPreview
  const topPost = preview.topPerforming

  const topPerformingLabel =
    preview.topPerformingState === "permission"
      ? "Unavailable from current permission"
      : preview.topPerformingState === "sync_failed"
        ? "Sync failed"
        : topPost
          ? liveText(topPost.message?.slice(0, 80) ?? null)
          : "No live data yet"

  return (
    <Card className="border-2 border-border bg-card/80 shadow-sm">
      <CardHeader className="space-y-5 border-b border-border/80 pb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl">{page.displayName}</CardTitle>
            <CardDescription>
              {page.platformLabel} analytics summary · {page.dateRangeLabel}
              {page.facebookPageId ? (
                <span className="ml-2 font-mono text-xs">
                  · Page ID {page.facebookPageId}
                </span>
              ) : null}
            </CardDescription>
            {page.pageName ? (
              <p className="text-sm text-muted-foreground">
                Facebook page: <strong>{page.pageName}</strong>
              </p>
            ) : null}
            {page.tokenResolutionHint ? (
              <p className="text-sm text-muted-foreground">
                {page.tokenResolutionHint}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Badge variant={connected ? "default" : "neutral"}>
                Connection: {page.connectionStatus}
              </Badge>
              <Badge variant="neutral">
                Facebook Page: {page.facebookPageStatus}
              </Badge>
              <Badge variant="neutral">
                Instagram: {page.instagramStatus}
              </Badge>
              <Badge variant="neutral">
                Webhook: {page.permissions.webhooks}
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

        <div className="rounded-lg border bg-muted/20 p-4">
          <h4 className="mb-3 text-sm font-semibold">Capabilities</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        <section className="space-y-4">
          <h3 className="text-base font-semibold">Performance overview</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total followers"
              value={formatMetaMetricDisplay(
                m.totalFollowers,
                m.states.totalFollowers
              )}
              state={m.states.totalFollowers}
            />
            <MetricCard
              label="Facebook page likes"
              value={formatMetaMetricDisplay(m.pageLikes, m.states.pageLikes)}
              state={m.states.pageLikes}
            />
            <MetricCard
              label="New followers"
              value={formatMetaMetricDisplay(
                m.newFollowers,
                m.states.newFollowers
              )}
              state={m.states.newFollowers}
            />
            <MetricCard
              label="New likes"
              value={formatMetaMetricDisplay(m.newLikes, m.states.newLikes)}
              state={m.states.newLikes}
            />
            <MetricCard
              label="Post engagements"
              value={formatMetaMetricDisplay(
                m.postEngagements,
                m.states.postEngagements
              )}
              state={m.states.postEngagements}
            />
            <MetricCard
              label="Total reactions"
              value={formatMetaMetricDisplay(m.reactions, m.states.reactions)}
              state={m.states.reactions}
            />
            <MetricCard
              label="Total comments"
              value={formatMetaMetricDisplay(m.comments, m.states.comments)}
              state={m.states.comments}
            />
            <MetricCard
              label="Total shares"
              value={formatMetaMetricDisplay(m.shares, m.states.shares)}
              state={m.states.shares}
            />
            <MetricCard
              label="Reach"
              value={formatMetaMetricDisplay(m.reach, m.states.reach)}
              state={m.states.reach}
            />
            <MetricCard
              label="Impressions"
              value={formatMetaMetricDisplay(
                m.impressions,
                m.states.impressions
              )}
              state={m.states.impressions}
            />
            <MetricCard
              label="Profile visits"
              value={formatMetaMetricDisplay(
                m.profileVisits,
                m.states.profileVisits
              )}
              state={m.states.profileVisits}
            />
            <MetricCard
              label="Link clicks"
              value={formatMetaMetricDisplay(m.linkClicks, m.states.linkClicks)}
              state={m.states.linkClicks}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border/80 bg-muted/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">Top performing post</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Highest total engagement (reactions + comments + shares).
              </p>
            </div>
            {m.topPerformingPostId ? (
              <Button type="button" variant="neutral" size="sm" asChild>
                <Link
                  href={`/admin/platform-analytics/meta/posts?pageKey=${page.key}&postId=${m.topPerformingPostId}`}
                >
                  View details
                </Link>
              </Button>
            ) : null}
          </div>
          {topPost ? (
            <div className="flex gap-3 rounded-lg border bg-background/50 p-3">
              <MetaPostThumbnail post={topPost} className="h-20 w-20" />
              <div className="min-w-0 flex-1 space-y-2">
                <MetaPostDate publishedAt={topPost.publishedAt} />
                <MetaPostCaption message={topPost.message} className="line-clamp-3" />
                <MetaPostEngagementStats post={topPost} />
                <p className="text-xs text-muted-foreground">
                  Engagement score:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {topPost.engagementTotal.toLocaleString("en-PH")}
                  </span>
                </p>
                <MetaPostExternalLink permalink={topPost.permalink} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{topPerformingLabel}</p>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">Post performance preview</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {preview.totalSynced.toLocaleString("en-PH")} posts synced
                {preview.lastPostsSyncAt
                  ? ` · Last posts sync ${dateFormatter.format(new Date(preview.lastPostsSyncAt))}`
                  : ""}
              </p>
            </div>
            <MetaViewAllPostsButton pageKey={page.key} />
          </div>

          {page.postsUnavailableMessage ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
              {page.postsUnavailableMessage}
            </p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Top 3 performing
              </h4>
              {preview.topPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No live data yet</p>
              ) : (
                preview.topPosts.map((post, index) => (
                  <PostPreviewCard
                    key={post.id}
                    post={post}
                    badge={`#${index + 1}`}
                  />
                ))
              )}
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Latest 3 posts
              </h4>
              {preview.latestPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No live data yet</p>
              ) : (
                preview.latestPosts.map((post) => (
                  <PostPreviewCard key={post.id} post={post} badge="Latest" />
                ))
              )}
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  )
}
