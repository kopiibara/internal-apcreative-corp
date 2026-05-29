"use client"

import { useMemo, useState } from "react"

import { FilterBadge } from "@/components/shared/filter-badge"
import { FilterBadgeGroup } from "@/components/shared/filter-badge-group"
import { GoogleAdsKpiCards } from "@/components/shared/google-ads-kpi-cards"
import { GoogleAdsPerformanceChart } from "@/components/shared/google-ads-performance-chart"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  DATA_TABLE_BODY_CLASS,
  DATA_TABLE_HEADER_CLASS,
  DataTableScrollArea,
} from "@/components/shared/data-table-scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ADS_PLATFORMS,
  type AdsCampaign,
  type AdsPlatform,
  type AssignedAdsBrand,
  type GoogleAdsMetric,
  type GoogleAdsSummary,
} from "@/lib/ads-campaigns-types"
import { summarizeGoogleAdsMetrics } from "@/lib/ads-campaigns/google-ads-metrics-display"

type AdminAdsCampaignsDashboardProps = {
  brands: AssignedAdsBrand[]
  campaigns: AdsCampaign[]
  metrics: GoogleAdsMetric[]
  summary: GoogleAdsSummary
}

const platformLabels: Record<AdsPlatform, string> = {
  GOOGLE: "Google",
  META: "Meta",
  TIKTOK: "TikTok",
}

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
})
const numberFormatter = new Intl.NumberFormat("en-US")

function formatPeso(value: number | null | undefined) {
  return pesoFormatter.format(value ?? 0)
}

function formatPercent(value: number | null | undefined) {
  return value == null ? "-" : `${value}%`
}

function formatDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "-"
}

function CampaignKpiCard({
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
    <Card className={`min-h-[128px] justify-between p-4 ${tone}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
        {label}
      </p>
      <div className="space-y-2 pt-8">
        <p className="text-2xl font-black tracking-tight">{value}</p>
        <p className="text-xs font-semibold opacity-90">{detail}</p>
      </div>
    </Card>
  )
}

export function AdminAdsCampaignsDashboard({
  brands,
  campaigns,
  metrics,
  summary,
}: AdminAdsCampaignsDashboardProps) {
  const [selectedPlatform, setSelectedPlatform] =
    useState<AdsPlatform>("GOOGLE")
  const [selectedBrandId, setSelectedBrandId] = useState("all")
  const visibleCampaigns = campaigns.filter(
    (campaign) =>
      campaign.platform === selectedPlatform &&
      (selectedBrandId === "all" || String(campaign.brandId) === selectedBrandId)
  )
  const visibleMetrics = metrics.filter(
    (metric) =>
      selectedPlatform === "GOOGLE" &&
      (selectedBrandId === "all" || String(metric.brandId) === selectedBrandId)
  )
  const campaignSummary = useMemo(() => {
    const totalLeads = visibleCampaigns.reduce(
      (total, campaign) => total + campaign.leads,
      0
    )
    const ctrValues = visibleCampaigns
      .map((campaign) => campaign.ctr)
      .filter((value): value is number => value != null)
    const roasValues = visibleCampaigns
      .map((campaign) => campaign.roas)
      .filter((value): value is number => value != null)

    return {
      totalLeads,
      avgCtr:
        ctrValues.length > 0
          ? ctrValues.reduce((total, value) => total + value, 0) /
          ctrValues.length
          : null,
      avgRoas:
        roasValues.length > 0
          ? roasValues.reduce((total, value) => total + value, 0) /
          roasValues.length
          : null,
    }
  }, [visibleCampaigns])
  const metricSummary = useMemo(
    () =>
      selectedBrandId === "all"
        ? summary
        : summarizeGoogleAdsMetrics(visibleMetrics),
    [selectedBrandId, summary, visibleMetrics]
  )

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <header className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          Ads Campaigns
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Monitor campaign performance, imported Google Ads metrics, and brand
          campaign records.
        </p>
      </header>

      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {ADS_PLATFORMS.map((platform) => (
            <FilterBadge
              key={platform}
              active={selectedPlatform === platform}
              onClick={() => setSelectedPlatform(platform)}
            >
              {platformLabels[platform]}
            </FilterBadge>
          ))}
        </div>
        <FilterBadgeGroup label="" className="min-w-0">
          {brands.map((brand) => (
            <FilterBadge
              key={brand.id}
              active={selectedBrandId === String(brand.id)}
              onClick={() => setSelectedBrandId(String(brand.id))}
            >
              {brand.name}
            </FilterBadge>
          ))}
        </FilterBadgeGroup>
      </div>

      {selectedPlatform === "GOOGLE" ? (
        <>
          <GoogleAdsKpiCards summary={metricSummary} compact />

          <section className="grid min-w-0 grid-cols-2 gap-2 md:gap-3 xl:grid-cols-3">
            <CampaignKpiCard
              label="Leads"
              value={numberFormatter.format(campaignSummary.totalLeads)}
              detail="Campaign leads"
              tone="bg-background text-foreground"
            />
            <CampaignKpiCard
              label="CTR"
              value={formatPercent(campaignSummary.avgCtr)}
              detail="Average CTR"
              tone="bg-blue text-white"
            />
            <CampaignKpiCard
              label="ROAS"
              value={
                campaignSummary.avgRoas == null
                  ? "-"
                  : String(campaignSummary.avgRoas.toFixed(2))
              }
              detail="Average ROAS"
              tone="bg-cyan text-white"
            />
          </section>

          <GoogleAdsPerformanceChart
            metrics={visibleMetrics}
            description="Read-only imported Google Ads metrics."
          />
        </>
      ) : (
        <section className="grid min-w-0 grid-cols-2 gap-2 md:gap-3 xl:grid-cols-3">
          <CampaignKpiCard
            label="Leads"
            value={numberFormatter.format(campaignSummary.totalLeads)}
            detail="Campaign leads"
            tone="bg-background text-foreground"
          />
          <CampaignKpiCard
            label="CTR"
            value={formatPercent(campaignSummary.avgCtr)}
            detail="Average CTR"
            tone="bg-blue text-white"
          />
          <CampaignKpiCard
            label="ROAS"
            value={
              campaignSummary.avgRoas == null
                ? "-"
                : String(campaignSummary.avgRoas.toFixed(2))
            }
            detail="Average ROAS"
            tone="bg-cyan text-white"
          />
        </section>
      )}

      <Card className="min-w-0 shadow-none">
        <CardHeader>
          <CardTitle>Campaign Tracker</CardTitle>
          <CardDescription>Read-only campaign records.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTableScrollArea>
            <Table className="min-w-[1080px] border-0">
              <TableHeader className={DATA_TABLE_HEADER_CLASS}>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>ROAS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={DATA_TABLE_BODY_CLASS}>
                {visibleCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                      No campaigns found for the active filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-bold">{campaign.campaignName}</TableCell>
                      <TableCell>
                        <Badge variant="neutral">
                          {platformLabels[campaign.platform]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{campaign.brandName}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{campaign.objective}</Badge>
                      </TableCell>
                      <TableCell>{formatPeso(campaign.spend)}</TableCell>
                      <TableCell>{campaign.leads}</TableCell>
                      <TableCell>{formatPercent(campaign.ctr)}</TableCell>
                      <TableCell>{campaign.roas == null ? "-" : campaign.roas}</TableCell>
                      <TableCell>
                        <StatusBadge status={campaign.status} type="campaign" size="sm" />
                      </TableCell>
                      <TableCell>{formatDate(campaign.startDate)}</TableCell>
                      <TableCell>{formatDate(campaign.endDate)}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </DataTableScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
