"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PRRequestMetrics } from "@/lib/pr/pr-types";
import { cn } from "@/lib/utils";

type PRMetricCardsProps = {
  metrics: PRRequestMetrics;
};

const cards: {
  key: keyof PRRequestMetrics;
  label: string;
  title: string;
  detail?: (metrics: PRRequestMetrics) => string | null;
  tone: string;
}[] = [
  {
    key: "totalRequests",
    label: "01 / REQUESTS",
    title: "Total Requests",
    detail: (metrics) =>
      metrics.totalRequests === 0
        ? "No PR requests in view"
        : `${metrics.totalRequests} recommendation${metrics.totalRequests === 1 ? "" : "s"} tracked`,
    tone: "bg-background text-foreground",
  },
  {
    key: "contactedCount",
    label: "02 / CONTACTED",
    title: "Contacted",
    detail: (metrics) =>
      metrics.totalRequests > 0
        ? `${metrics.contactedCount} of ${metrics.totalRequests} marked contacted`
        : "Contacted count",
    tone: "bg-blue text-white",
  },
  {
    key: "scheduledVisitsCount",
    label: "03 / VISITS",
    title: "Scheduled Visits",
    detail: (metrics) =>
      metrics.scheduledVisitsCount === 0
        ? "No visit dates set yet"
        : `${metrics.scheduledVisitsCount} with date of visit`,
    tone: "bg-cyan text-white",
  },
  {
    key: "paidCollabsCount",
    label: "04 / PAID",
    title: "Paid Collabs",
    detail: (metrics) =>
      metrics.paidCollabsCount === 0
        ? "No paid collaborations yet"
        : `${metrics.paidCollabsCount} collaboration${metrics.paidCollabsCount === 1 ? "" : "s"} paid`,
    tone: "bg-magenta text-white",
  },
];

export function PRMetricCards({ metrics }: PRMetricCardsProps) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const detail = card.detail?.(metrics);

        return (
          <Card
            key={card.key}
            className={cn(
              "min-h-[150px] min-w-0 justify-between overflow-hidden px-4 py-4 md:min-h-[190px] md:px-6 md:py-6",
              card.tone,
            )}
          >
            <CardHeader className="gap-0 px-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
                {card.label}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 px-0">
              <CardTitle className="text-3xl font-black uppercase leading-[0.9] tracking-normal md:text-4xl">
                {metrics[card.key]}
              </CardTitle>
              <CardDescription className="text-xs font-semibold leading-snug opacity-90">
                {card.title}
              </CardDescription>
              {detail ? (
                <p className="text-xs font-semibold opacity-80">{detail}</p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
