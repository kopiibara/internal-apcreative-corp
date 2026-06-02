import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlatformAnalyticsCharts } from "@/components/admin/platform-analytics/platform-analytics-charts";
import { ClientDateTime } from "@/components/shared/client-date-time";
import type { KpiMetric } from "@/lib/platform-analytics/types";
import type {
  YouTubeChannelDashboard,
  YouTubeSourceSyncStatus,
} from "@/lib/youtube/channel-analytics-types";
import { cn } from "@/lib/utils";

type YouTubeChannelCardProps = {
  channel: YouTubeChannelDashboard;
};

function StatusPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "ok" | "warn" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <span>{label}</span>
      <span
        className={cn(
          tone === "ok" && "text-green-700 dark:text-green-400",
          tone === "warn" && "text-amber-700 dark:text-amber-300",
          tone === "neutral" && "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function syncStatusTone(status: YouTubeSourceSyncStatus): "ok" | "warn" | "neutral" {
  if (status === "success") {
    return "ok";
  }
  if (status === "failed" || status === "missing_token") {
    return "warn";
  }
  return "neutral";
}

function formatSyncStatus(status: YouTubeSourceSyncStatus) {
  switch (status) {
    case "success":
      return "Success";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
    case "missing_token":
      return "Not authorized";
    case "no_data":
      return "No data";
    case "never":
    default:
      return "Never";
  }
}

function ChannelKpiGrid({ metrics }: { metrics: KpiMetric[] }) {
  if (metrics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No YouTube analytics available yet.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border border-border/80 bg-card/60 p-3"
        >
          <p className="text-xs text-muted-foreground">{metric.label}</p>
          <p className="mt-1 text-lg font-semibold leading-tight">{metric.value}</p>
          {metric.hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function YouTubeChannelCard({ channel }: YouTubeChannelCardProps) {
  const connected = channel.connectionStatus === "Connected";

  return (
    <Card className="border-2 border-border bg-card/80 shadow-sm">
      <CardHeader className="space-y-5 border-b border-border/80 pb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl">{channel.displayName}</CardTitle>
            <CardDescription>
              YouTube channel analytics
              {channel.channelId ? (
                <span className="ml-2 font-mono text-xs">
                  · Channel ID {channel.channelId}
                </span>
              ) : null}
            </CardDescription>
            <div className="flex flex-wrap gap-2">
              <Badge variant={connected ? "default" : "neutral"}>
                Connection: {channel.connectionStatus}
              </Badge>
              <Badge variant={channel.oauthStatus === "Authorized" ? "default" : "neutral"}>
                Google OAuth: {channel.oauthStatus}
              </Badge>
            </div>
            {channel.statusMessage ? (
              <p className="text-sm text-muted-foreground">{channel.statusMessage}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatusPill
            label="Last sync"
            value={
              channel.lastSyncAt ? (
                <ClientDateTime value={channel.lastSyncAt} placeholder="Never" />
              ) : (
                "Never"
              )
            }
          />
          <StatusPill
            label="Video sync"
            value={formatSyncStatus(channel.videoSyncStatus)}
            tone={syncStatusTone(channel.videoSyncStatus)}
          />
          <StatusPill
            label="Analytics sync"
            value={formatSyncStatus(channel.analyticsSyncStatus)}
            tone={syncStatusTone(channel.analyticsSyncStatus)}
          />
          <StatusPill
            label="Connected videos"
            value={String(channel.contentPerformance.length)}
            tone={channel.contentPerformance.length > 0 ? "ok" : "neutral"}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        <section className="space-y-4">
          <h3 className="text-base font-semibold">Performance overview</h3>
          <ChannelKpiGrid metrics={channel.overviewKpis} />
        </section>

        {channel.charts.length > 0 ? (
          <section className="space-y-4">
            <h3 className="text-base font-semibold">Trends</h3>
            <PlatformAnalyticsCharts
              charts={channel.charts}
              isDemo={false}
              emptyMessage="No YouTube chart data yet."
            />
          </section>
        ) : null}

        <section className="space-y-4">
          <h3 className="text-base font-semibold">Video performance</h3>
          {channel.contentPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No YouTube videos synced yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Video title</th>
                    <th className="px-3 py-2">Views</th>
                    <th className="px-3 py-2">Likes</th>
                    <th className="px-3 py-2">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {channel.contentPerformance.slice(0, 5).map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="max-w-xs truncate px-3 py-2">{row.title}</td>
                      <td className="px-3 py-2 tabular-nums">{row.views ?? "-"}</td>
                      <td className="px-3 py-2 tabular-nums">{row.likes ?? "-"}</td>
                      <td className="px-3 py-2 tabular-nums">{row.comments ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
