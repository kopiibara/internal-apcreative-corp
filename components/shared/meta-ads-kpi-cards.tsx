"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { MetaAdsSummary } from "@/lib/ads-campaigns-types"
import {
  formatMetaAdsNumber,
  formatMetaAdsPeso,
} from "@/lib/ads-campaigns/meta-ads-metrics-display"

function KpiCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone: string
}) {
  return (
    <Card className={`min-h-[140px] justify-between px-4 py-4 ${tone}`}>
      <CardHeader className="gap-0 px-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
          {label}
        </p>
      </CardHeader>
      <CardContent className="space-y-2 px-0">
        <CardTitle className="text-3xl font-black uppercase leading-none tracking-normal">
          {value}
        </CardTitle>
        <CardDescription className="text-xs font-semibold opacity-90">
          {detail}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

type MetaAdsKpiCardsProps = {
  summary: MetaAdsSummary
}

export function MetaAdsKpiCards({ summary }: MetaAdsKpiCardsProps) {
  const cards = [
    {
      key: "spend",
      label: "01 / Spend",
      value: formatMetaAdsPeso(summary.totalSpend),
      detail: "Total Meta Ads spend",
      tone: "bg-background text-foreground",
    },
    {
      key: "leads",
      label: "02 / Leads",
      value: formatMetaAdsNumber(summary.totalLeads),
      detail: "Imported messaging contacts",
      tone: "bg-blue text-white",
    },
    {
      key: "cpa",
      label: "03 / Avg. CPA",
      value:
        summary.avgCpa == null ? "-" : formatMetaAdsPeso(summary.avgCpa),
      detail: "Spend divided by leads",
      tone: "bg-cyan text-white",
    },
    {
      key: "roas",
      label: "04 / Avg. ROAS",
      value:
        summary.avgRoas == null ? "-" : summary.avgRoas.toFixed(2),
      detail: "Average purchase ROAS from import",
      tone: "bg-magenta text-white",
    },
  ]

  return (
    <section className="grid min-w-0 grid-cols-2 gap-2 pr-1 md:gap-3 xl:grid-cols-4">
      {cards.map((card) => (
        <KpiCard
          key={card.key}
          label={card.label}
          value={card.value}
          detail={card.detail}
          tone={card.tone}
        />
      ))}
    </section>
  )
}
