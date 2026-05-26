"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  bootstrapMetaMonitoringAction,
  fetchPlatformAnalyticsAction,
  syncAllMetaMonitoringAction,
  triggerMetaSyncAction,
} from "@/app/admin/platform-analytics/actions"
import { MetaBusinessPageCard } from "@/components/admin/platform-analytics/meta-business-page-card"
import { PlatformAnalyticsCharts } from "@/components/admin/platform-analytics/platform-analytics-charts"
import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
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
import {
  PAGE_SUBTITLE,
  PAGE_TITLE,
  PLATFORM_NAV,
  PLATFORM_VIEW_COPY,
} from "@/lib/platform-analytics/constants"
import type {
  AnalyticsPlatform,
  KpiMetric,
  PlatformAnalyticsDashboardData,
  PlatformCode,
} from "@/lib/platform-analytics/types"
import { cn } from "@/lib/utils"

type PlatformAnalyticsDashboardProps = {
  initialData: PlatformAnalyticsDashboardData
  canManage: boolean
  bootstrapMessage?: string | null
}

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

const PLATFORM_TABS: Record<PlatformCode, { value: string; label: string }[]> = {
  META: [
    { value: "overview", label: "Overview" },
    { value: "content", label: "Content Performance" },
    { value: "audience", label: "Audience Insights" },
    { value: "engagement", label: "Engagement" },
    { value: "logs", label: "Webhook Activity" },
    { value: "sync", label: "Sync History" },
  ],
  TIKTOK: [
    { value: "overview", label: "Overview" },
    { value: "content", label: "Video Performance" },
    { value: "audience", label: "Audience Insights" },
    { value: "engagement", label: "Engagement" },
    { value: "logs", label: "Webhook Activity" },
    { value: "sync", label: "Sync History" },
  ],
  YOUTUBE: [
    { value: "overview", label: "Overview" },
    { value: "content", label: "Video Performance" },
    { value: "audience", label: "Audience Retention" },
    { value: "engagement", label: "Engagement" },
    { value: "logs", label: "Webhook Activity" },
    { value: "sync", label: "Sync History" },
  ],
  GOOGLE: [
    { value: "overview", label: "Overview" },
    { value: "campaigns", label: "Campaign Performance" },
    { value: "adgroups", label: "Ad Group Performance" },
    { value: "keywords", label: "Keywords" },
    { value: "conversions", label: "Conversion Tracking" },
    { value: "logs", label: "Webhook Activity" },
    { value: "sync", label: "Sync History" },
  ],
}

export function PlatformAnalyticsDashboard({
  initialData,
  canManage,
  bootstrapMessage,
}: PlatformAnalyticsDashboardProps) {
  const [data, setData] = useState(initialData)
  const [platform, setPlatform] = useState<AnalyticsPlatform>(
    initialData.platform === "META" ? "META" : initialData.platform
  )
  const [accountId, setAccountId] = useState("all")
  const [isPending, startTransition] = useTransition()

  const platformCode = platform as PlatformCode
  const copy = PLATFORM_VIEW_COPY[platformCode]

  useEffect(() => {
    if (bootstrapMessage) {
      if (bootstrapMessage.toLowerCase().includes("fail")) {
        toast.error(bootstrapMessage)
      } else {
        toast.message(bootstrapMessage)
      }
    }
  }, [bootstrapMessage])

  function reload(nextPlatform?: AnalyticsPlatform, nextAccount?: string) {
    startTransition(async () => {
      const p = nextPlatform ?? platform
      const result = await fetchPlatformAnalyticsAction({
        platform: p,
        accountId:
          (nextAccount ?? accountId) === "all" ? null : (nextAccount ?? accountId),
        metaScope: "combined",
      })
      if (!result.success || !result.data) {
        toast.error(result.message)
        return
      }
      setData(result.data)
    })
  }

  function handlePlatformChange(next: AnalyticsPlatform) {
    setPlatform(next)
    setAccountId("all")
    reload(next, "all")
  }

  function handleBootstrap() {
    startTransition(async () => {
      const result = await bootstrapMetaMonitoringAction()
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      reload("META", accountId)
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
      reload()
    })
  }

  function handleSync(
    syncType: "hourly_posts" | "daily_page" | "daily_insights"
  ) {
    startTransition(async () => {
      const result = await triggerMetaSyncAction(syncType)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      reload()
    })
  }

  const tabs =
    platform === "META"
      ? [
          { value: "logs", label: "Webhook Activity" },
          { value: "sync", label: "Sync History" },
        ]
      : PLATFORM_TABS[platformCode]

  return (
    <div className="min-w-0 space-y-6">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">{PAGE_TITLE}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {PAGE_SUBTITLE}
            </p>
          </div>
          <PlatformActions
            platform={platform}
            canManage={canManage}
            isPending={isPending}
            onConnect={handleBootstrap}
            onSyncAll={handleSyncAll}
            onSyncPosts={() => handleSync("hourly_posts")}
            onSyncInsights={() => handleSync("daily_insights")}
            onSyncPage={() => handleSync("daily_page")}
          />
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border pb-3">
          {PLATFORM_NAV.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={platform === item.value ? "default" : "neutral"}
              disabled={isPending}
              onClick={() => handlePlatformChange(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </header>

      <section className="space-y-4 rounded-lg border border-border bg-card/40 p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{copy.title}</h2>
              <PlatformBadge platform={platformCode} />
              {data.isDemo ? (
                <DemoBadge />
              ) : (
                <Badge variant="default">
                  {data.connection.apiConnected
                    ? copy.liveBadge
                    : copy.demoBadge}
                </Badge>
              )}
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {copy.subtitle}
            </p>
          </div>

        </div>

        {platform !== "META" ? (
          <ConnectionStatusCard connection={data.connection} isDemo={data.isDemo} />
        ) : null}

        {!data.isDemo &&
        data.metaNeedsBootstrap &&
        canManage &&
        platform === "META" ? (
          <p className="text-sm text-muted-foreground">
            Connect Meta to start syncing analytics. Use{" "}
            <strong>Connect Meta</strong> above after setting environment variables
            in your host.
          </p>
        ) : null}
      </section>

      {platform === "META" ? (
        <section className="space-y-6">
          {data.metaBusinessPages.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No Meta business pages are enabled. Set{" "}
                <code className="text-xs">NEON_NIGHTS_META_ENABLED=true</code> and
                configure the Page ID and access token.
              </CardContent>
            </Card>
          ) : (
            data.metaBusinessPages.map((page) => (
              <MetaBusinessPageCard key={page.key} page={page} />
            ))
          )}
        </section>
      ) : (
        <>
          <KpiGrid metrics={data.overviewKpis} />
          <PlatformAnalyticsCharts
            charts={data.charts}
            isDemo={data.isDemo}
            emptyMessage={
              data.isDemo
                ? undefined
                : "No live data yet — run sync after connecting Meta."
            }
          />
        </>
      )}

      <Tabs defaultValue={platform === "META" ? "logs" : "overview"}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {platform !== "META" ? (
          <>
            <TabsContent value="overview" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Summary metrics are shown above. Use the other tabs for detailed
                tables and logs.
              </p>
            </TabsContent>

            <TabsContent value="content" className="pt-4">
              {platform === "GOOGLE" ? (
                <PlaceholderPanel message="Content performance is not applicable for Google Ads." />
              ) : (
                <ContentTable platform={platformCode} rows={data.contentPerformance} />
              )}
            </TabsContent>

            <TabsContent value="audience" className="space-y-4 pt-4">
              <KpiGrid metrics={data.audienceInsightKpis} />
              {platform !== "GOOGLE" ? (
                <GrowthTable rows={data.growthSnapshots} isDemo={data.isDemo} />
              ) : null}
            </TabsContent>

            <TabsContent value="engagement" className="space-y-4 pt-4">
              {platform === "GOOGLE" ? (
                <PlaceholderPanel message="Engagement metrics are not applicable for Google Ads." />
              ) : (
                <KpiGrid metrics={data.engagementKpis} />
              )}
            </TabsContent>
          </>
        ) : null}

        <TabsContent value="campaigns" className="pt-4">
          <CampaignTable rows={data.campaignPerformance} />
        </TabsContent>

        <TabsContent value="adgroups" className="pt-4">
          <PlaceholderPanel message="Ad group performance will appear here once Google Ads is connected." />
        </TabsContent>

        <TabsContent value="keywords" className="pt-4">
          <PlaceholderPanel message="Keyword reporting will appear here once Google Ads is connected." />
        </TabsContent>

        <TabsContent value="conversions" className="pt-4">
          <KpiGrid metrics={data.audienceInsightKpis} />
        </TabsContent>

        <TabsContent value="logs" className="pt-4">
          <ActivityLogs logs={data.activityLogs} />
        </TabsContent>

        <TabsContent value="sync" className="pt-4">
          <SyncHistoryTable rows={data.syncHistory} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PlatformActions({
  platform,
  canManage,
  isPending,
  onConnect,
  onSyncAll,
  onSyncPosts,
  onSyncPage,
  onSyncInsights,
}: {
  platform: AnalyticsPlatform
  canManage: boolean
  isPending: boolean
  onConnect: () => void
  onSyncAll: () => void
  onSyncPosts: () => void
  onSyncPage: () => void
  onSyncInsights: () => void
}) {
  if (!canManage) {
    return null
  }

  if (platform === "META") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" disabled={isPending} onClick={onConnect}>
          Connect Meta
        </Button>
        <Button type="button" variant="neutral" disabled={isPending} onClick={onSyncAll}>
          Sync Meta
        </Button>
        <Button type="button" variant="neutral" disabled={isPending} onClick={onSyncPage}>
          Sync Page
        </Button>
        <Button type="button" variant="neutral" disabled={isPending} onClick={onSyncPosts}>
          Sync Posts
        </Button>
        <Button type="button" variant="neutral" disabled={isPending} onClick={onSyncInsights}>
          Sync Insights
        </Button>
      </div>
    )
  }

  if (platform === "TIKTOK") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="neutral" disabled>
          Connect TikTok
        </Button>
        <Button type="button" variant="neutral" disabled>
          Sync TikTok
        </Button>
        <Button type="button" variant="neutral" disabled>
          Sync Videos
        </Button>
      </div>
    )
  }

  if (platform === "YOUTUBE") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="neutral" disabled>
          Connect YouTube
        </Button>
        <Button type="button" variant="neutral" disabled>
          Sync YouTube
        </Button>
        <Button type="button" variant="neutral" disabled>
          Sync Videos
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="neutral" disabled>
        Connect Google Ads
      </Button>
      <Button type="button" variant="neutral" disabled>
        Sync Google Ads
      </Button>
      <Button type="button" variant="neutral" disabled>
        Sync Campaigns
      </Button>
    </div>
  )
}

function ConnectionStatusCard({
  connection,
  isDemo,
}: {
  connection: PlatformAnalyticsDashboardData["connection"]
  isDemo: boolean
}) {
  return (
    <Card className="border-border/80 bg-background/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Platform connection status</CardTitle>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant={connection.apiConnected ? "default" : "neutral"}>
            {connection.apiConnected ? "Connected" : "Not connected"}
          </Badge>
          {isDemo ? <DemoBadge /> : null}
          {connection.webhookSupported ? (
            <Badge variant={connection.webhookConfigured ? "default" : "neutral"}>
              {connection.webhookConfigured ? "Webhook ready" : "Webhook pending"}
            </Badge>
          ) : null}
          <Badge variant="neutral">Sync: {connection.syncHealth}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {connection.statusRows.map((row) => (
            <StatusRow key={row.label} label={row.label} ok={row.ok} detail={row.detail} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function KpiGrid({ metrics }: { metrics: KpiMetric[] }) {
  if (metrics.length === 0) {
    return null
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardDescription>{metric.label}</CardDescription>
              {metric.isDemo ? <DemoBadge /> : null}
            </div>
            <CardTitle className="text-2xl tabular-nums leading-tight">
              {metric.value}
            </CardTitle>
            {metric.hint ? (
              <p className="text-xs text-muted-foreground">{metric.hint}</p>
            ) : null}
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

function GrowthTable({
  rows,
  isDemo,
}: {
  rows: PlatformAnalyticsDashboardData["growthSnapshots"]
  isDemo: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Growth snapshots</CardTitle>
        {isDemo ? <CardDescription>Sample Data</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full" scrollbars="horizontal">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Followers / subscribers</th>
                <th className="py-2 pr-4">Secondary</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-muted-foreground">
                    No live data yet
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-2 pr-4">{row.date}</td>
                    <td className="py-2 pr-4">{row.followers ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {row.secondaryLabel}: {row.secondaryValue ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function ContentTable({
  platform,
  rows,
}: {
  platform: PlatformCode
  rows: PlatformAnalyticsDashboardData["contentPerformance"]
}) {
  const isGoogle = platform === "GOOGLE"
  const isYouTube = platform === "YOUTUBE"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isYouTube ? "Video performance" : "Content performance"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full" scrollbars="horizontal">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Published</th>
                <th className="py-2 pr-4">Views</th>
                {isYouTube ? (
                  <>
                    <th className="py-2 pr-4">Watch time</th>
                    <th className="py-2 pr-4">Avg. duration</th>
                  </>
                ) : null}
                <th className="py-2 pr-4">Likes</th>
                <th className="py-2 pr-4">Comments</th>
                <th className="py-2 pr-4">Shares</th>
                {platform === "TIKTOK" ? (
                  <>
                    <th className="py-2 pr-4">Engagement</th>
                    <th className="py-2 pr-4">Profile visits</th>
                  </>
                ) : null}
                <th className="py-2 pr-4">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-6 text-muted-foreground">
                    {isGoogle ? "N/A" : "No live data yet"}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b align-top">
                    <td className="max-w-xs py-2 pr-4">
                      <span className="line-clamp-2">{row.title}</span>
                    </td>
                    <td className="py-2 pr-4">
                      {row.publishedAt
                        ? dateFormatter.format(new Date(row.publishedAt))
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">{row.views ?? "—"}</td>
                    {isYouTube ? (
                      <>
                        <td className="py-2 pr-4">{row.watchTime ?? "—"}</td>
                        <td className="py-2 pr-4">{row.avgViewDuration ?? "—"}</td>
                      </>
                    ) : null}
                    <td className="py-2 pr-4">{row.likes}</td>
                    <td className="py-2 pr-4">{row.comments}</td>
                    <td className="py-2 pr-4">{row.shares}</td>
                    {platform === "TIKTOK" ? (
                      <>
                        <td className="py-2 pr-4">{row.engagementRate ?? "—"}</td>
                        <td className="py-2 pr-4">{row.profileVisits ?? "—"}</td>
                      </>
                    ) : null}
                    <td className="py-2 pr-4">{row.source}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function CampaignTable({
  rows,
}: {
  rows: PlatformAnalyticsDashboardData["campaignPerformance"]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Campaign performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full" scrollbars="horizontal">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Campaign</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Impressions</th>
                <th className="py-2 pr-4">Clicks</th>
                <th className="py-2 pr-4">CTR</th>
                <th className="py-2 pr-4">CPC</th>
                <th className="py-2 pr-4">Spend</th>
                <th className="py-2 pr-4">Conversions</th>
                <th className="py-2 pr-4">Cost / conv.</th>
                <th className="py-2 pr-4">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-muted-foreground">
                    No campaign data yet
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-2 pr-4">{row.campaignName}</td>
                    <td className="py-2 pr-4">{row.status}</td>
                    <td className="py-2 pr-4">
                      {row.impressions.toLocaleString("en-PH")}
                    </td>
                    <td className="py-2 pr-4">{row.clicks.toLocaleString("en-PH")}</td>
                    <td className="py-2 pr-4">{row.ctr}</td>
                    <td className="py-2 pr-4">{row.cpc}</td>
                    <td className="py-2 pr-4">{row.spend}</td>
                    <td className="py-2 pr-4">{row.conversions}</td>
                    <td className="py-2 pr-4">{row.costPerConversion}</td>
                    <td className="py-2 pr-4">{row.source}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function ActivityLogs({
  logs,
}: {
  logs: PlatformAnalyticsDashboardData["activityLogs"]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Webhook activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-3 pr-4">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity logged yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {log.isDemo ? <DemoBadge /> : null}
                    <StatusBadge status={log.status} />
                    <span className="font-medium">{log.eventType}</span>
                    <span className="text-muted-foreground">
                      {dateFormatter.format(new Date(log.receivedAt))}
                    </span>
                  </div>
                  <p className="mt-2 text-muted-foreground">{log.summary}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function SyncHistoryTable({
  rows,
}: {
  rows: PlatformAnalyticsDashboardData["syncHistory"]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sync history</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full" scrollbars="horizontal">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Started</th>
                <th className="py-2 pr-4">Job</th>
                <th className="py-2 pr-4">Account</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Records</th>
                <th className="py-2 pr-4">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 pr-4">
                    {dateFormatter.format(new Date(row.startedAt))}
                  </td>
                  <td className="py-2 pr-4">{row.syncType}</td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {row.accountId ?? "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={row.status} />
                    {row.isDemo ? (
                      <span className="ml-2">
                        <DemoBadge />
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4">{row.recordsSynced}</td>
                  <td className="max-w-xs py-2 pr-4 text-destructive">
                    {row.errorMessage ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function PlaceholderPanel({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  )
}

function PlatformBadge({ platform }: { platform: PlatformCode }) {
  const labels = { META: "Meta", TIKTOK: "TikTok", YOUTUBE: "YouTube", GOOGLE: "Google" }
  return (
    <Badge variant="neutral" className={cn("font-medium")}>
      {labels[platform]}
    </Badge>
  )
}

function DemoBadge() {
  return (
    <Badge
      variant="secondary"
      className="border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
    >
      Demo Data
    </Badge>
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
      <span className={ok ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-300"}>
        {detail ?? (ok ? "OK" : "Missing")}
      </span>
    </div>
  )
}
