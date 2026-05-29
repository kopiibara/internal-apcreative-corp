"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  bootstrapMetaMonitoringAction,
  disconnectYouTubeAction,
  fetchPlatformAnalyticsAction,
  syncMetaPageMonitoringAction,
  syncAllMetaMonitoringAction,
  syncYouTubeAction,
  triggerMetaSyncAction,
} from "@/app/admin/platform-analytics/actions";
import { MetaBusinessPageCard } from "@/components/admin/platform-analytics/meta-business-page-card";
import { PlatformAnalyticsCharts } from "@/components/admin/platform-analytics/platform-analytics-charts";
import { KANBAN_BOARD_PAGE_CLASS } from "@/components/shared/kanban-board-scroll";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  META_SCOPE_OPTIONS,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  PLATFORM_NAV,
  PLATFORM_VIEW_COPY,
} from "@/lib/platform-analytics/constants";
import type {
  AnalyticsDateRange,
  AnalyticsPlatform,
  KpiMetric,
  MetaScope,
  PlatformAnalyticsDashboardData,
  PlatformCode,
} from "@/lib/platform-analytics/types";
import type { PlatformAnalyticsBrandScopeUi } from "@/lib/platform-analytics/brand-scope";
import { FilterBadge } from "@/components/shared/filter-badge";
import { cn } from "@/lib/utils";

type PlatformAnalyticsDashboardProps = {
  initialData: PlatformAnalyticsDashboardData;
  canManage: boolean;
  bootstrapMessage?: string | null;
  brandScopeUi?: PlatformAnalyticsBrandScopeUi;
  analyticsBasePath?: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
});

const META_DATE_RANGE_OPTIONS: Array<{
  value: AnalyticsDateRange;
  label: string;
}> = [
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 days" },
    { value: "28d", label: "Last 28 days" },
    { value: "month", label: "This month" },
    { value: "custom", label: "Custom range" },
  ];

const YOUTUBE_DATE_RANGE_OPTIONS: Array<{
  value: AnalyticsDateRange;
  label: string;
}> = [
    { value: "7d", label: "Last 7 days" },
    { value: "28d", label: "Last 28 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "365d", label: "Last 365 days" },
  ];

const PLATFORM_TABS: Record<PlatformCode, { value: string; label: string }[]> =
{
  META: [{ value: "sync", label: "Sync History" }],
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
    { value: "audience", label: "Audience Growth" },
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
};

export function PlatformAnalyticsDashboard({
  initialData,
  canManage,
  bootstrapMessage,
  brandScopeUi = {
    hasAllBrandsAccess: true,
    defaultMetaPageKey: "all",
    showAllPagesOption: true,
    assignedBrandNames: [],
    scopeDescription: "All brands",
  },
  analyticsBasePath = "/admin/platform-analytics",
}: PlatformAnalyticsDashboardProps) {
  const [data, setData] = useState(initialData);
  const [platform, setPlatform] = useState<AnalyticsPlatform>(
    initialData.platform === "META" ? "META" : initialData.platform,
  );
  const [metaScope, setMetaScope] = useState<MetaScope>("combined");
  const [metaPageKey, setMetaPageKey] = useState<string>(
    brandScopeUi.defaultMetaPageKey,
  );
  const [accountId, setAccountId] = useState("all");
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>("28d");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [isPending, startTransition] = useTransition();

  const platformCode = platform as PlatformCode;
  const copy = PLATFORM_VIEW_COPY[platformCode];
  const tabs = PLATFORM_TABS[platformCode];

  useEffect(() => {
    if (bootstrapMessage) {
      if (bootstrapMessage.toLowerCase().includes("fail")) {
        toast.error(bootstrapMessage);
      } else {
        toast.message(bootstrapMessage);
      }
    }
  }, [bootstrapMessage]);

  function reload(
    nextPlatform?: AnalyticsPlatform,
    nextAccount?: string,
    nextScope?: MetaScope,
    nextDateRange?: AnalyticsDateRange,
    nextCustomFrom?: string,
    nextCustomTo?: string,
  ) {
    startTransition(async () => {
      const p = nextPlatform ?? platform;
      const selectedAccount = nextAccount ?? accountId;
      const range = nextDateRange ?? dateRange;
      const result = await fetchPlatformAnalyticsAction({
        platform: p,
        accountId: selectedAccount === "all" ? null : selectedAccount,
        metaScope: p === "META" ? (nextScope ?? metaScope) : "combined",
        dateRange: range,
        customDateFrom:
          range === "custom" ? (nextCustomFrom ?? customDateFrom) || null : null,
        customDateTo:
          range === "custom" ? (nextCustomTo ?? customDateTo) || null : null,
      });

      if (!result.success || !result.data) {
        toast.error(result.message);
        return;
      }

      setData(result.data);
    });
  }

  function handlePlatformChange(next: AnalyticsPlatform) {
    setPlatform(next);
    setAccountId("all");
    reload(next, "all");
  }

  function handleMetaScopeChange(scope: MetaScope) {
    setMetaScope(scope);
    reload("META", accountId, scope);
  }

  function handleDateRangeChange(nextRange: AnalyticsDateRange) {
    setDateRange(nextRange);

    if (nextRange !== "custom") {
      if (platform === "META") {
        reload(platform, accountId, metaScope, nextRange);
        return;
      }
    } else if (platform === "META") {
      return;
    }

    if (platform !== "YOUTUBE") {
      return;
    }

    startTransition(async () => {
      const result = await syncYouTubeAction({
        accountId: accountId === "all" ? null : accountId,
        dateRange: nextRange,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      reload("YOUTUBE", accountId, "combined", nextRange);
    });
  }

  function handleBootstrap() {
    startTransition(async () => {
      const result = await bootstrapMetaMonitoringAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      reload("META", accountId, metaScope);
    });
  }

  function handleYouTubeConnect() {
    startTransition(async () => {
      window.location.href = "/api/platform-analytics/youtube/connect";
    });
  }

  function handleYouTubeDisconnect() {
    startTransition(async () => {
      if (!window.confirm("Disconnect this YouTube account?")) {
        return;
      }

      const result = await disconnectYouTubeAction({
        accountId: accountId === "all" ? null : accountId,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setAccountId("all");
      reload("YOUTUBE", "all", "combined", dateRange);
    });
  }

  function handleYouTubeSync() {
    startTransition(async () => {
      const result = await syncYouTubeAction({
        accountId: accountId === "all" ? null : accountId,
        dateRange,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      reload("YOUTUBE", accountId, "combined", dateRange);
    });
  }

  function handleSyncAll() {
    startTransition(async () => {
      const result =
        platform === "META" && metaPageKey !== "all"
          ? await syncMetaPageMonitoringAction({ pageKey: metaPageKey })
          : await syncAllMetaMonitoringAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      reload();
    });
  }

  function handleSync(
    syncType: "hourly_posts" | "daily_page" | "daily_insights",
  ) {
    startTransition(async () => {
      const result =
        platform === "META" && metaPageKey !== "all"
          ? await triggerMetaSyncAction(syncType, { pageKey: metaPageKey })
          : await triggerMetaSyncAction(syncType);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      reload();
    });
  }

  const dateRangeOptions =
    platform === "META"
      ? META_DATE_RANGE_OPTIONS
      : platform === "YOUTUBE"
        ? YOUTUBE_DATE_RANGE_OPTIONS
        : null;

  return (
    <div className={KANBAN_BOARD_PAGE_CLASS}>
      <header className="shrink-0 space-y-4 pb-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal">
            {PAGE_TITLE}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {PAGE_SUBTITLE}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <PlatformAnalyticsFilterBar
            brandScopeUi={brandScopeUi}
            platform={platform}
            dateRange={dateRange}
            dateRangeOptions={dateRangeOptions}
            isPending={isPending}
            onPlatformChange={handlePlatformChange}
            onDateRangeChange={handleDateRangeChange}
          />
          <PlatformActions
            platform={platform}
            isConnected={data.connection.apiConnected}
            canManage={canManage}
            isPending={isPending}
            onConnect={
              platform === "YOUTUBE" ? handleYouTubeConnect : handleBootstrap
            }
            onDisconnect={
              platform === "YOUTUBE" ? handleYouTubeDisconnect : undefined
            }
            onSyncAll={
              platform === "YOUTUBE" ? handleYouTubeSync : handleSyncAll
            }
            onSyncPosts={() =>
              platform === "YOUTUBE"
                ? handleYouTubeSync()
                : handleSync("hourly_posts")
            }
            onSyncPage={() => handleSync("daily_page")}
            onSyncInsights={() =>
              platform === "YOUTUBE"
                ? handleYouTubeSync()
                : handleSync("daily_insights")
            }
          />
        </div>

        {platform === "META" && dateRange === "custom" ? (
          <AnalyticsCustomDateRange
            customDateFrom={customDateFrom}
            customDateTo={customDateTo}
            isPending={isPending}
            onCustomDateFromChange={setCustomDateFrom}
            onCustomDateToChange={setCustomDateTo}
            onApplyCustom={() =>
              reload(
                platform,
                accountId,
                metaScope,
                "custom",
                customDateFrom,
                customDateTo,
              )
            }
          />
        ) : null}
      </header>

      <ScrollArea
        className="h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden"
        scrollbars="vertical"
        viewportClassName="h-full max-h-full"
      >
        <div className="min-w-0 space-y-6 pr-2 pb-4">
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

          {platform === "META" ? (
            <div className="flex flex-wrap gap-1">
              {META_SCOPE_OPTIONS.map((scope) => (
                <Button
                  key={scope.value}
                  type="button"
                  size="sm"
                  variant={metaScope === scope.value ? "default" : "neutral"}
                  disabled={isPending}
                  onClick={() => handleMetaScopeChange(scope.value)}
                >
                  {scope.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {platform === "META" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Sync target:</span>
            {brandScopeUi.showAllPagesOption ? (
              <Button
                type="button"
                size="sm"
                variant={metaPageKey === "all" ? "default" : "neutral"}
                disabled={isPending}
                onClick={() => setMetaPageKey("all")}
              >
                All enabled pages
              </Button>
            ) : null}
            {data.metaBusinessPages.map((page) => (
              <Button
                key={page.key}
                type="button"
                size="sm"
                variant={metaPageKey === page.key ? "default" : "neutral"}
                disabled={isPending}
                onClick={() => setMetaPageKey(page.key)}
              >
                {page.displayName}
              </Button>
            ))}
          </div>
        ) : null}

        <ConnectionStatusCard
          connection={data.connection}
          isDemo={data.isDemo}
        />

        {!data.isDemo &&
          data.metaNeedsBootstrap &&
          canManage &&
          platform === "META" ? (
          <p className="text-sm text-muted-foreground">
            Connect Meta to start syncing analytics. Use{" "}
            <strong>Connect Meta</strong> above after setting environment
            variables in your host.
          </p>
        ) : null}
      </section>

      {platform === "META" ? (
        <section className="space-y-6">
          {isPending ? (
            <MetaAnalyticsLoadingSkeleton />
          ) : data.metaBusinessPages.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {brandScopeUi.hasAllBrandsAccess ? (
                  <>
                    No Meta business pages are enabled. Set{" "}
                    <code className="text-xs">*_META_ENABLED=true</code> (e.g.{" "}
                    <code className="text-xs">PRO_GROUP_META_ENABLED</code>) and
                    configure the matching Page ID and Page Access Token.
                  </>
                ) : (
                  <>
                    No Meta pages are available for{" "}
                    <strong>{brandScopeUi.scopeDescription}</strong>. Ask an admin
                    to connect the Facebook page for your assigned brand(s), or
                    confirm your brand assignment matches the configured Meta
                    pages.
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            (metaPageKey === "all"
              ? data.metaBusinessPages
              : data.metaBusinessPages.filter((page) => page.key === metaPageKey)
            ).map((page) => (
              <MetaBusinessPageCard
                key={page.key}
                page={page}
                analyticsBasePath={analyticsBasePath}
              />
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
                : "No live data yet - run sync after connecting the selected platform."
            }
          />
        </>
      )}

      <Tabs defaultValue={platform === "META" ? "sync" : "overview"}>
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
                <ContentTable
                  platform={platformCode}
                  rows={data.contentPerformance}
                  lastSyncedAt={data.connection.lastSyncAt}
                />
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
      </ScrollArea>
    </div>
  );
}

const PLATFORM_ACTIONS_ROW_CLASS =
  "flex shrink-0 flex-wrap items-center justify-end gap-2";

function PlatformActions({
  platform,
  isConnected,
  canManage,
  isPending,
  onConnect,
  onDisconnect,
  onSyncAll,
  onSyncPosts,
  onSyncPage,
  onSyncInsights,
}: {
  platform: AnalyticsPlatform;
  isConnected: boolean;
  canManage: boolean;
  isPending: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
  onSyncAll: () => void;
  onSyncPosts: () => void;
  onSyncPage: () => void;
  onSyncInsights: () => void;
}) {
  if (!canManage) {
    return null;
  }

  if (platform === "META") {
    return (
      <div className={PLATFORM_ACTIONS_ROW_CLASS}>
        <Button
          type="button"
          variant="default"
          disabled={isPending}
          onClick={onConnect}
        >
          Connect Meta
        </Button>
        <Button
          type="button"
          variant="neutral"
          disabled={isPending}
          onClick={onSyncAll}
        >
          Sync Meta
        </Button>
        <Button
          type="button"
          variant="neutral"
          disabled={isPending}
          onClick={onSyncPage}
        >
          Sync Page
        </Button>
        <Button
          type="button"
          variant="neutral"
          disabled={isPending}
          onClick={onSyncPosts}
        >
          Sync Posts
        </Button>
        <Button
          type="button"
          variant="neutral"
          disabled={isPending}
          onClick={onSyncInsights}
        >
          Sync Insights
        </Button>
      </div>
    );
  }

  if (platform === "TIKTOK") {
    return (
      <div className={PLATFORM_ACTIONS_ROW_CLASS}>
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
    );
  }

  if (platform === "YOUTUBE") {
    return (
      <div className={PLATFORM_ACTIONS_ROW_CLASS}>
        <Button
          type="button"
          variant={isConnected ? "neutral" : "default"}
          disabled={isPending || isConnected}
          onClick={onConnect}
        >
          {isConnected ? "Connected" : "Connect YouTube"}
        </Button>
        {isConnected ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={onDisconnect}
          >
            Disconnect YouTube
          </Button>
        ) : null}
        <Button
          type="button"
          variant="neutral"
          disabled={isPending || !isConnected}
          onClick={onSyncAll}
        >
          Sync YouTube
        </Button>
        <Button
          type="button"
          variant="neutral"
          disabled={isPending || !isConnected}
          onClick={onSyncPosts}
        >
          Sync Videos
        </Button>
      </div>
    );
  }

  return (
    <div className={PLATFORM_ACTIONS_ROW_CLASS}>
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
  );
}

function ConnectionStatusCard({
  connection,
  isDemo,
}: {
  connection: PlatformAnalyticsDashboardData["connection"];
  isDemo: boolean;
}) {
  return (
    <Card className="border-border/80 bg-background/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Platform connection status</CardTitle>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant={connection.apiConnected ? "default" : "neutral"}>
            {connection.apiConnected
              ? "Facebook pages configured"
              : "Not configured"}
          </Badge>
          {isDemo ? <DemoBadge /> : null}
          <Badge variant="neutral">Sync: {connection.syncHealth}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {connection.statusRows.map((row) => (
            <StatusRow
              key={row.label}
              label={row.label}
              ok={row.ok}
              detail={row.detail}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function KpiGrid({ metrics }: { metrics: KpiMetric[] }) {
  if (metrics.length === 0) {
    return null;
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
  );
}

function GrowthTable({
  rows,
  isDemo,
}: {
  rows: PlatformAnalyticsDashboardData["growthSnapshots"];
  isDemo: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Growth snapshots</CardTitle>
        {isDemo ? <CardDescription>Sample Data</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full" scrollbars="horizontal">
          <table className="w-full min-w-160 border-collapse text-sm">
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
                    <td className="py-2 pr-4">{row.followers ?? "-"}</td>
                    <td className="py-2 pr-4">
                      {row.secondaryLabel}: {row.secondaryValue ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ContentTable({
  platform,
  rows,
  lastSyncedAt,
}: {
  platform: PlatformCode;
  rows: PlatformAnalyticsDashboardData["contentPerformance"];
  lastSyncedAt: string | null;
}) {
  const isGoogle = platform === "GOOGLE";
  const isYouTube = platform === "YOUTUBE";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isYouTube ? "Video performance" : "Content performance"}
        </CardTitle>
        {isYouTube ? (
          <CardDescription>
            Synced content performance. Last synced: {lastSyncedAt ?? "Never"}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full" scrollbars="horizontal">
          <table className="w-full min-w-250 border-collapse text-sm">
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
                    {isGoogle ? "N/A" : "No synced data yet"}
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
                        : "-"}
                    </td>
                    <td className="py-2 pr-4">{row.views ?? "-"}</td>
                    {isYouTube ? (
                      <>
                        <td className="py-2 pr-4">{row.watchTime ?? "-"}</td>
                        <td className="py-2 pr-4">
                          {row.avgViewDuration ?? "-"}
                        </td>
                      </>
                    ) : null}
                    <td className="py-2 pr-4">{row.likes}</td>
                    <td className="py-2 pr-4">{row.comments}</td>
                    <td className="py-2 pr-4">{row.shares}</td>
                    {platform === "TIKTOK" ? (
                      <>
                        <td className="py-2 pr-4">
                          {row.engagementRate ?? "-"}
                        </td>
                        <td className="py-2 pr-4">
                          {row.profileVisits ?? "-"}
                        </td>
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
  );
}

function CampaignTable({
  rows,
}: {
  rows: PlatformAnalyticsDashboardData["campaignPerformance"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Campaign performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full" scrollbars="horizontal">
          <table className="w-full min-w-240 border-collapse text-sm">
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
                    <td className="py-2 pr-4">
                      {row.clicks.toLocaleString("en-PH")}
                    </td>
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
  );
}

function ActivityLogs({
  logs,
}: {
  logs: PlatformAnalyticsDashboardData["activityLogs"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Webhook activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-100 w-full">
          <div className="space-y-3 pr-4">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activity logged yet.
              </p>
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
  );
}

function SyncHistoryTable({
  rows,
}: {
  rows: PlatformAnalyticsDashboardData["syncHistory"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sync history</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full" scrollbars="horizontal">
          <table className="w-full min-w-200 border-collapse text-sm">
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
                    {row.accountId ?? "-"}
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
                    {row.errorMessage ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function PlaceholderPanel({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

function PlatformBadge({ platform }: { platform: PlatformCode }) {
  const labels = {
    META: "Meta",
    TIKTOK: "TikTok",
    YOUTUBE: "YouTube",
    GOOGLE: "Google",
  };

  return (
    <Badge variant="neutral" className={cn("font-medium")}>
      {labels[platform]}
    </Badge>
  );
}

function DemoBadge() {
  return (
    <Badge
      variant="secondary"
      className="border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
    >
      Demo Data
    </Badge>
  );
}

function StatusRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <span>{label}</span>
      <span
        className={
          ok
            ? "text-green-700 dark:text-green-400"
            : "text-amber-700 dark:text-amber-300"
        }
      >
        {detail ?? (ok ? "OK" : "Missing")}
      </span>
    </div>
  );
}

function FilterBarSeparator() {
  return (
    <span
      className="shrink-0 px-0.5 text-sm font-semibold text-muted-foreground"
      aria-hidden
    >
      |
    </span>
  );
}

function PlatformAnalyticsFilterBar({
  brandScopeUi,
  platform,
  dateRange,
  dateRangeOptions,
  isPending,
  onPlatformChange,
  onDateRangeChange,
}: {
  brandScopeUi: PlatformAnalyticsBrandScopeUi;
  platform: AnalyticsPlatform;
  dateRange: AnalyticsDateRange;
  dateRangeOptions: Array<{ value: AnalyticsDateRange; label: string }> | null;
  isPending: boolean;
  onPlatformChange: (platform: AnalyticsPlatform) => void;
  onDateRangeChange: (range: AnalyticsDateRange) => void;
}) {
  const hasBrandFilters =
    brandScopeUi.hasAllBrandsAccess ||
    brandScopeUi.assignedBrandNames.length > 0;

  return (
    <ScrollArea className="min-w-0 w-full flex-1" scrollbars="horizontal">
      <div className="flex w-max min-w-0 items-center gap-2 pb-1 pr-2">
        {hasBrandFilters ? (
          <div className="flex shrink-0 items-center gap-2">
            {brandScopeUi.hasAllBrandsAccess ? (
              <FilterBadge
                active
                type="button"
                className="pointer-events-none"
              >
                All brands
              </FilterBadge>
            ) : (
              brandScopeUi.assignedBrandNames.map((brandName) => (
                <FilterBadge
                  key={brandName}
                  active
                  type="button"
                  className="pointer-events-none"
                >
                  {brandName}
                </FilterBadge>
              ))
            )}
          </div>
        ) : null}

        {dateRangeOptions && dateRangeOptions.length > 0 ? (
          <>
            {hasBrandFilters ? <FilterBarSeparator /> : null}
            <div className="flex shrink-0 items-center gap-2">
              {dateRangeOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={dateRange === option.value ? "default" : "neutral"}
                  disabled={isPending}
                  onClick={() => onDateRangeChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </>
        ) : null}

        {hasBrandFilters ||
        (dateRangeOptions && dateRangeOptions.length > 0) ? (
          <FilterBarSeparator />
        ) : null}

        <div className="flex shrink-0 items-center gap-2">
          {PLATFORM_NAV.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={platform === item.value ? "default" : "neutral"}
              disabled={isPending}
              onClick={() => onPlatformChange(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function AnalyticsCustomDateRange({
  customDateFrom,
  customDateTo,
  isPending,
  onCustomDateFromChange,
  onCustomDateToChange,
  onApplyCustom,
}: {
  customDateFrom: string;
  customDateTo: string;
  isPending: boolean;
  onCustomDateFromChange: (value: string) => void;
  onCustomDateToChange: (value: string) => void;
  onApplyCustom: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">From</label>
        <Input
          type="date"
          value={customDateFrom}
          disabled={isPending}
          onChange={(event) => onCustomDateFromChange(event.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">To</label>
        <Input
          type="date"
          value={customDateTo}
          disabled={isPending}
          onChange={(event) => onCustomDateToChange(event.target.value)}
          className="w-40"
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="default"
        disabled={isPending || !customDateFrom || !customDateTo}
        onClick={onApplyCustom}
      >
        Apply range
      </Button>
    </div>
  );
}

function MetaAnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((key) => (
        <Card key={key} className="border-2 border-border">
          <CardHeader className="space-y-4">
            <Skeleton className="h-7 w-56" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
