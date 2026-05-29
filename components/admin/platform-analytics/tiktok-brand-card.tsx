import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientDateTime } from "@/components/shared/client-date-time";
import type { KpiMetric, TikTokBrandDashboard } from "@/lib/platform-analytics/types";
import { cn } from "@/lib/utils";

type TikTokBrandCardProps = {
  brand: TikTokBrandDashboard;
};

function StatusPill({
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
        className={cn(
          "text-right text-muted-foreground",
          ok && "text-green-700 dark:text-green-400",
          !ok && "text-amber-700 dark:text-amber-300",
        )}
      >
        {detail ?? (ok ? "OK" : "Needs attention")}
      </span>
    </div>
  );
}

function BrandKpiGrid({ metrics }: { metrics: KpiMetric[] }) {
  if (metrics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No live data yet</p>
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
          <p className="mt-1 text-lg font-semibold">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}

function connectionBadgeVariant(
  status: TikTokBrandDashboard["connectionStatus"],
) {
  switch (status) {
    case "Connected":
      return "default" as const;
    case "Reconnect required":
      return "destructive" as const;
    case "Error":
      return "destructive" as const;
    default:
      return "neutral" as const;
  }
}

export function TikTokBrandCard({ brand }: TikTokBrandCardProps) {
  return (
    <Card className="border-border/80 bg-background/50">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">{brand.brandName}</CardTitle>
          <Badge variant={connectionBadgeVariant(brand.connectionStatus)}>
            {brand.connectionStatus}
          </Badge>
          {brand.accountName ? (
            <Badge variant="neutral">{brand.accountName}</Badge>
          ) : null}
        </div>
        <CardDescription>
          TikTok account{" "}
          {brand.openId ? (
            <span className="font-mono text-xs">{brand.openId}</span>
          ) : (
            "not connected"
          )}
          {brand.lastSyncAt ? (
            <>
              {" "}
              · Last sync{" "}
              <ClientDateTime value={brand.lastSyncAt} />
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {brand.statusRows.map((row) => (
            <StatusPill
              key={row.label}
              label={row.label}
              ok={row.ok}
              detail={row.detail}
            />
          ))}
        </div>

        {brand.lastError ? (
          <p className="text-sm text-destructive">{brand.lastError}</p>
        ) : null}

        {brand.missingScopes.length > 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Missing TikTok permissions: {brand.missingScopes.join(", ")}. Reconnect
            TikTok and approve these scopes in the TikTok developer portal.
          </p>
        ) : null}

        <BrandKpiGrid metrics={brand.overviewKpis} />
        <BrandKpiGrid metrics={brand.engagementKpis} />
      </CardContent>
    </Card>
  );
}
