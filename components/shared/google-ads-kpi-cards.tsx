"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { GoogleAdsSummary } from "@/lib/ads-campaigns-types"
import {
  formatGoogleAdsNumber,
  formatGoogleAdsPeso,
} from "@/lib/ads-campaigns/google-ads-metrics-display"

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

type GoogleAdsKpiCardsProps = {
  summary: GoogleAdsSummary
  compact?: boolean
}

export function GoogleAdsKpiCards({ summary, compact = false }: GoogleAdsKpiCardsProps) {
  const { availability } = summary
  const cards: Array<{
    key: string
    label: string
    value: string
    detail: string
    tone: string
  }> = [
    {
      key: "cost",
      label: compact ? "Spend" : "01 / Spend",
      value: formatGoogleAdsPeso(summary.totalCost),
      detail: "Total Google Ads cost",
      tone: "bg-background text-foreground",
    },
    {
      key: "conversions",
      label: compact ? "Conv." : "03 / Conversions",
      value: formatGoogleAdsNumber(summary.totalConversions),
      detail: "Imported conversion count",
      tone: "bg-cyan text-white",
    },
  ]

  if (availability.hasImpressions && summary.totalImpressions != null) {
    cards.splice(1, 0, {
      key: "impressions",
      label: compact ? "Impr." : "02 / Impressions",
      value: formatGoogleAdsNumber(summary.totalImpressions),
      detail: "Total ad impressions",
      tone: "bg-blue text-white",
    })
  }

  if (availability.hasAvgTargetCpa) {
    cards.push({
      key: "avgTargetCpa",
      label: compact ? "Avg. CPA" : "04 / Avg. Target CPA",
      value:
        summary.avgTargetCpa == null
          ? "-"
          : formatGoogleAdsPeso(summary.avgTargetCpa),
      detail: "Average target CPA from import",
      tone: "bg-magenta text-white",
    })
  } else if (availability.hasConversions) {
    cards.push({
      key: "avgCpa",
      label: compact ? "CPA" : "04 / CPA",
      value:
        summary.avgCpa == null ? "-" : formatGoogleAdsPeso(summary.avgCpa),
      detail: "Cost divided by conversions",
      tone: "bg-magenta text-white",
    })
  }

  if (
    availability.hasConversionValue &&
    summary.totalConversionValue != null
  ) {
    cards.push({
      key: "conversionValue",
      label: compact ? "Conv. Value" : "Conv. Value",
      value: formatGoogleAdsPeso(summary.totalConversionValue),
      detail: "Total conversion value",
      tone: "bg-background text-foreground",
    })
  }

  if (
    availability.hasConversionValuePerClick &&
    summary.avgConversionValuePerClick != null
  ) {
    cards.push({
      key: "conversionValuePerClick",
      label: compact ? "CV / Click" : "CV / Click",
      value: formatGoogleAdsPeso(summary.avgConversionValuePerClick),
      detail: "Average conversion value per click",
      tone: "bg-blue text-white",
    })
  }

  return (
    <section
      className={`grid min-w-0 gap-2 pr-1 ${
        compact
          ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
          : "grid-cols-2 md:gap-3 xl:grid-cols-4"
      }`}
    >
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
