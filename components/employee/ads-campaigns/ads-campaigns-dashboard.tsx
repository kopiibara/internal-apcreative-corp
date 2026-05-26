"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileUp, Pencil, Plus, Trash2 } from "lucide-react"

import {
  createAdsCampaign,
  deleteAdsCampaign,
  importGoogleAdsCsvMetrics,
  updateAdsCampaign,
} from "@/app/employee/ads-campaigns/actions"
import { GoogleAdsImportDialog } from "@/components/employee/ads-campaigns/google-ads-import-dialog"
import { FilterBadge } from "@/components/shared/filter-badge"
import { FilterBadgeGroup } from "@/components/shared/filter-badge-group"
import { GoogleAdsKpiCards } from "@/components/shared/google-ads-kpi-cards"
import { GoogleAdsPerformanceChart } from "@/components/shared/google-ads-performance-chart"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  ADS_PLATFORMS,
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_STATUSES,
  type AdsCampaign,
  type AdsPlatform,
  type AssignedAdsBrand,
  type CampaignStatus,
  type GoogleAdsMetric,
  type GoogleAdsSummary,
} from "@/lib/ads-campaigns-types"
import { summarizeGoogleAdsMetrics } from "@/lib/ads-campaigns/google-ads-metrics-display"

type AdsCampaignsDashboardProps = {
  brands: AssignedAdsBrand[]
  campaigns: AdsCampaign[]
  metrics: GoogleAdsMetric[]
  summary: GoogleAdsSummary
}

type CampaignDraft = {
  campaignId?: number
  brandId: string
  platform: AdsPlatform
  campaignName: string
  objective: string
  spend: string
  leads: string
  ctr: string
  roas: string
  status: CampaignStatus
  startDate: string
  endDate: string
  notes: string
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

function formatPeso(value: number | null | undefined) {
  return pesoFormatter.format(value ?? 0)
}

function formatPercent(value: number | null | undefined) {
  if (value == null) {
    return "-"
  }

  return `${value}%`
}

function toOptionalNumber(value: string) {
  return value.trim() ? Number(value) : null
}

function getDefaultBrandId(brands: AssignedAdsBrand[]) {
  return String(brands[0]?.id ?? "")
}

function getCampaignDraft(
  brands: AssignedAdsBrand[],
  campaign?: AdsCampaign
): CampaignDraft {
  return {
    campaignId: campaign?.id,
    brandId: campaign ? String(campaign.brandId) : getDefaultBrandId(brands),
    platform: campaign?.platform ?? "GOOGLE",
    campaignName: campaign?.campaignName ?? "",
    objective: campaign?.objective ?? "Lead Gen",
    spend: campaign ? String(campaign.spend) : "0",
    leads: campaign ? String(campaign.leads) : "0",
    ctr: campaign?.ctr == null ? "" : String(campaign.ctr),
    roas: campaign?.roas == null ? "" : String(campaign.roas),
    status: campaign?.status ?? "ACTIVE",
    startDate: campaign?.startDate ?? "",
    endDate: campaign?.endDate ?? "",
    notes: campaign?.notes ?? "",
  }
}

function CampaignDialog({
  open,
  brands,
  draft,
  onOpenChange,
  onDraftChange,
  onSubmit,
  isPending,
}: {
  open: boolean
  brands: AssignedAdsBrand[]
  draft: CampaignDraft
  onOpenChange: (open: boolean) => void
  onDraftChange: (draft: CampaignDraft) => void
  onSubmit: () => void
  isPending: boolean
}) {
  const isEditing = Boolean(draft.campaignId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Campaign" : "Create Campaign"}
          </DialogTitle>
          <DialogDescription>
            Track platform, brand, spend, leads, and campaign status.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Campaign Name</Label>
            <Input
              value={draft.campaignName}
              onChange={(event) =>
                onDraftChange({ ...draft, campaignName: event.target.value })
              }
              placeholder="Google Search - Lead Gen"
            />
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={draft.platform}
              onValueChange={(value) =>
                onDraftChange({ ...draft, platform: value as AdsPlatform })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADS_PLATFORMS.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platformLabels[platform]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Brand</Label>
            <Select
              value={draft.brandId}
              onValueChange={(brandId) => onDraftChange({ ...draft, brandId })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={String(brand.id)}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Objective</Label>
            <Select
              value={draft.objective}
              onValueChange={(objective) =>
                onDraftChange({ ...draft, objective })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_OBJECTIVES.map((objective) => (
                  <SelectItem key={objective} value={objective}>
                    {objective}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={draft.status}
              onValueChange={(status) =>
                onDraftChange({ ...draft, status: status as CampaignStatus })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Spend</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.spend}
              onChange={(event) =>
                onDraftChange({ ...draft, spend: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Leads</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={draft.leads}
              onChange={(event) =>
                onDraftChange({ ...draft, leads: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>CTR</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.ctr}
              onChange={(event) =>
                onDraftChange({ ...draft, ctr: event.target.value })
              }
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label>ROAS</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.roas}
              onChange={(event) =>
                onDraftChange({ ...draft, roas: event.target.value })
              }
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={draft.startDate}
              onChange={(event) =>
                onDraftChange({ ...draft, startDate: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={draft.endDate}
              onChange={(event) =>
                onDraftChange({ ...draft, endDate: event.target.value })
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={draft.notes}
              onChange={(event) =>
                onDraftChange({ ...draft, notes: event.target.value })
              }
              placeholder="Optional campaign notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending
              ? "Saving..."
              : isEditing
                ? "Save Campaign"
                : "Create Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdsCampaignsDashboard({
  brands,
  campaigns,
  metrics,
  summary,
}: AdsCampaignsDashboardProps) {
  const router = useRouter()
  const [selectedPlatform, setSelectedPlatform] =
    useState<AdsPlatform>("GOOGLE")
  const [selectedBrandId, setSelectedBrandId] = useState(
    brands.length === 1 ? String(brands[0].id) : "all"
  )
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [selectedSourceFile, setSelectedSourceFile] = useState("all")
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] =
    useState<AdsCampaign | null>(null)
  const [draft, setDraft] = useState<CampaignDraft>(
    getCampaignDraft(brands)
  )
  const [isPending, startTransition] = useTransition()
  const selectedBrand =
    selectedBrandId === "all"
      ? null
      : brands.find((brand) => String(brand.id) === selectedBrandId) ?? null
  const visibleCampaigns = campaigns.filter(
    (campaign) =>
      campaign.platform === selectedPlatform &&
      (selectedBrandId === "all" || String(campaign.brandId) === selectedBrandId)
  )
  const visibleMetrics = metrics.filter(
    (metric) =>
      (selectedBrandId === "all" || String(metric.brandId) === selectedBrandId) &&
      (selectedMonth === "all" || metric.metricDate.startsWith(selectedMonth)) &&
      (selectedSourceFile === "all" || metric.sourceFileName === selectedSourceFile)
  )
  const baseFilteredMetrics = metrics.filter(
    (metric) =>
      selectedBrandId === "all" || String(metric.brandId) === selectedBrandId
  )
  const monthOptions = Array.from(
    new Set(baseFilteredMetrics.map((metric) => metric.metricDate.slice(0, 7)))
  ).sort((left, right) => right.localeCompare(left))
  const fileOptions = Array.from(
    new Set(
      baseFilteredMetrics
        .map((metric) => metric.sourceFileName)
        .filter((fileName): fileName is string => Boolean(fileName))
    )
  ).sort()
  const visibleSummary = useMemo(
    () =>
      selectedBrandId === "all" &&
        selectedMonth === "all" &&
        selectedSourceFile === "all"
        ? summary
        : summarizeGoogleAdsMetrics(visibleMetrics),
    [selectedBrandId, selectedMonth, selectedSourceFile, summary, visibleMetrics]
  )

  function openCreateDialog() {
    setDraft({
      campaignId: undefined,
      brandId: selectedBrand ? String(selectedBrand.id) : getDefaultBrandId(brands),
      platform: selectedPlatform,
      campaignName: "",
      objective: "Lead Gen",
      spend: "0",
      leads: "0",
      ctr: "",
      roas: "",
      status: "ACTIVE",
      startDate: "",
      endDate: "",
      notes: "",
    })
    setDialogOpen(true)
  }

  function submitCampaign() {
    const payload = {
      campaignId: draft.campaignId,
      brandId: Number(draft.brandId),
      platform: draft.platform,
      campaignName: draft.campaignName,
      objective: draft.objective,
      spend: Number(draft.spend || 0),
      leads: Number(draft.leads || 0),
      ctr: toOptionalNumber(draft.ctr),
      roas: toOptionalNumber(draft.roas),
      status: draft.status,
      startDate: draft.startDate || null,
      endDate: draft.endDate || null,
      notes: draft.notes || null,
    }

    startTransition(async () => {
      const result = draft.campaignId
        ? await updateAdsCampaign(payload)
        : await createAdsCampaign(payload)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setDialogOpen(false)
      router.refresh()
    })
  }

  function submitDelete() {
    if (!campaignToDelete) {
      return
    }

    startTransition(async () => {
      const result = await deleteAdsCampaign(campaignToDelete.id)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setCampaignToDelete(null)
      router.refresh()
    })
  }

  function submitCsvImport(file: File) {
    if (selectedBrandId === "all") {
      toast.error("Choose one brand before importing Google Ads data.")
      return
    }

    startTransition(async () => {
      const csvText = await file.text()
      const result = await importGoogleAdsCsvMetrics({
        brandId: Number(selectedBrandId),
        fileName: file.name,
        csvText,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setImportDialogOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between p-1">
        <div>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">
            Ads Campaigns
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Track campaign performance, imported Google Ads data, and brand
            campaign records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedPlatform === "GOOGLE" ? (
            <Button
              type="button"
              variant="neutral"
              onClick={() => setImportDialogOpen(true)}
            >
              <FileUp className="size-4" />
              Import CSV
            </Button>
          ) : null}
          <Button onClick={openCreateDialog} disabled={brands.length === 0}>
            <Plus className="size-4" />
            New Campaign
          </Button>
        </div>
      </div>

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
          <FilterBadge
            active={selectedBrandId === "all"}
            disabled={brands.length <= 1}
            onClick={() => setSelectedBrandId("all")}
          >
            All Brands
          </FilterBadge>
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
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterBadgeGroup label="Month" className="min-w-0">
            <FilterBadge
              active={selectedMonth === "all"}
              onClick={() => setSelectedMonth("all")}
            >
              All Months
            </FilterBadge>
            {monthOptions.map((month) => (
              <FilterBadge
                key={month}
                active={selectedMonth === month}
                onClick={() => setSelectedMonth(month)}
              >
                {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </FilterBadge>
            ))}
          </FilterBadgeGroup>

          <FilterBadgeGroup label="Import" className="min-w-0">
            <FilterBadge
              active={selectedSourceFile === "all"}
              onClick={() => setSelectedSourceFile("all")}
            >
              All Imports
            </FilterBadge>
            {fileOptions.map((fileName) => (
              <FilterBadge
                key={fileName}
                active={selectedSourceFile === fileName}
                onClick={() => setSelectedSourceFile(fileName)}
              >
                {fileName}
              </FilterBadge>
            ))}
          </FilterBadgeGroup>
        </div>
      ) : null}

      {selectedPlatform === "GOOGLE" ? (
        <>
          <GoogleAdsKpiCards summary={visibleSummary} />

          <GoogleAdsPerformanceChart metrics={visibleMetrics} />
        </>
      ) : (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{platformLabels[selectedPlatform]} Ads</CardTitle>
            <CardDescription>
              Import and API integrations for this platform are coming soon.
              You can still create and track campaign records below.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="min-w-0 shadow-none">
        <CardHeader>
          <CardTitle>Campaign Tracker</CardTitle>
          <CardDescription>
            Campaign records filtered by selected platform and brand.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border-2 border-border bg-card">
            <ScrollArea className="w-full" scrollbars="horizontal">
              <Table className="min-w-[980px] border-0">
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Objective</TableHead>
                    <TableHead>Spend</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>CTR</TableHead>
                    <TableHead>ROAS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No campaigns found for the active filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-bold">{campaign.campaignName}</p>
                            <p className="text-xs text-muted-foreground">
                              {platformLabels[campaign.platform]}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{campaign.brandName}</TableCell>
                        <TableCell>{campaign.objective}</TableCell>
                        <TableCell>{formatPeso(campaign.spend)}</TableCell>
                        <TableCell>{campaign.leads}</TableCell>
                        <TableCell>{formatPercent(campaign.ctr)}</TableCell>
                        <TableCell>
                          {campaign.roas == null ? "-" : campaign.roas}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={campaign.status}
                            type="campaign"
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDraft(getCampaignDraft(brands, campaign))
                                setDialogOpen(true)
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setCampaignToDelete(campaign)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <CampaignDialog
        open={dialogOpen}
        brands={brands}
        draft={draft}
        onOpenChange={setDialogOpen}
        onDraftChange={setDraft}
        onSubmit={submitCampaign}
        isPending={isPending}
      />

      <GoogleAdsImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        selectedBrandId={selectedBrandId}
        lastSourceFileName={summary.lastSourceFileName}
        isPending={isPending}
        onImport={submitCsvImport}
      />

      <AlertDialog
        open={Boolean(campaignToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setCampaignToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {campaignToDelete?.campaignName}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={submitDelete}
              disabled={isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
