"use client"

import { Search } from "lucide-react"

import { contentTypes, platformOptions } from "@/app/employee/approvals/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  APPROVAL_STATUSES,
  PUBLISH_STATUSES,
} from "@/lib/approvals/approval-statuses"
import { getUniqueApprovalBrands } from "@/lib/approvals/approval-filters"
import { useContentReportStore } from "@/stores/use-content-report-store"
import type { ContentReport } from "@/types/content-report"

type EmployeeApprovalFiltersProps = {
  reports: ContentReport[]
}

export function EmployeeApprovalFilters({ reports }: EmployeeApprovalFiltersProps) {
  const {
    searchQuery,
    selectedBrandFilter,
    selectedContentTypeFilter,
    selectedPlatformFilter,
    selectedSupervisorStatusFilter,
    selectedDirectorStatusFilter,
    selectedPublishStatusFilter,
    setSearchQuery,
    setSelectedBrandFilter,
    setSelectedContentTypeFilter,
    setSelectedPlatformFilter,
    setSelectedSupervisorStatusFilter,
    setSelectedDirectorStatusFilter,
    setSelectedPublishStatusFilter,
    resetContentReportFilters,
  } = useContentReportStore()

  const brandOptions = getUniqueApprovalBrands(reports)

  return (
    <ScrollArea className="w-full pb-2" scrollbars="horizontal">
      <div className="flex w-max min-w-full items-center gap-2 pr-3">
        <div className="relative min-w-[260px] md:min-w-[320px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search reports"
            className="h-9 pl-9"
          />
        </div>

        <Select value={selectedBrandFilter} onValueChange={setSelectedBrandFilter}>
          <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brandOptions.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedContentTypeFilter}
          onValueChange={setSelectedContentTypeFilter}
        >
          <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
            <SelectValue placeholder="Content type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All content types</SelectItem>
            {contentTypes.map((contentType) => (
              <SelectItem key={contentType} value={contentType}>
                {contentType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedPlatformFilter}
          onValueChange={setSelectedPlatformFilter}
        >
          <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {platformOptions.map((platform) => (
              <SelectItem key={platform} value={platform}>
                {platform}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedSupervisorStatusFilter}
          onValueChange={setSelectedSupervisorStatusFilter}
        >
          <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
            <SelectValue placeholder="Supervisor status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All supervisor statuses</SelectItem>
            {APPROVAL_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedDirectorStatusFilter}
          onValueChange={setSelectedDirectorStatusFilter}
        >
          <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
            <SelectValue placeholder="Director status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All director statuses</SelectItem>
            {APPROVAL_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedPublishStatusFilter}
          onValueChange={setSelectedPublishStatusFilter}
        >
          <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
            <SelectValue placeholder="Publish status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All publish statuses</SelectItem>
            {PUBLISH_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="neutral"
          size="sm"
          className="h-9 whitespace-nowrap"
          onClick={resetContentReportFilters}
        >
          Reset Filters
        </Button>
      </div>
    </ScrollArea>
  )
}
