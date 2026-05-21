import type { ContentReport } from "@/types/content-report"

export type ApprovalFilterState = {
  searchQuery: string
  selectedBrandFilter: string
  selectedContentTypeFilter: string
  selectedPlatformFilter: string
  selectedSupervisorStatusFilter: string
  selectedDirectorStatusFilter: string
  selectedPublishStatusFilter: string
}

export function getUniqueApprovalBrands(reports: ContentReport[]) {
  return Array.from(
    new Set(
      reports
        .map((report) => report.brandName)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b))
}

export function filterApprovalReports(
  reports: ContentReport[],
  filters: ApprovalFilterState
) {
  const normalizedQuery = filters.searchQuery.trim().toLowerCase()

  return reports.filter((report) => {
    const matchesSearch =
      normalizedQuery.length === 0 ||
      report.submittedByName.toLowerCase().includes(normalizedQuery) ||
      report.submittedByEmail.toLowerCase().includes(normalizedQuery) ||
      report.caption.toLowerCase().includes(normalizedQuery) ||
      report.contentType.toLowerCase().includes(normalizedQuery) ||
      report.platform.toLowerCase().includes(normalizedQuery) ||
      (report.brandName ?? "").toLowerCase().includes(normalizedQuery) ||
      (report.contentInspo ?? "").toLowerCase().includes(normalizedQuery) ||
      (report.employeeComments ?? "").toLowerCase().includes(normalizedQuery)

    return (
      matchesSearch &&
      (filters.selectedBrandFilter === "all" ||
        report.brandName === filters.selectedBrandFilter) &&
      (filters.selectedContentTypeFilter === "all" ||
        report.contentType === filters.selectedContentTypeFilter) &&
      (filters.selectedPlatformFilter === "all" ||
        report.platform === filters.selectedPlatformFilter) &&
      (filters.selectedSupervisorStatusFilter === "all" ||
        report.supervisorStatus === filters.selectedSupervisorStatusFilter) &&
      (filters.selectedDirectorStatusFilter === "all" ||
        report.directorStatus === filters.selectedDirectorStatusFilter) &&
      (filters.selectedPublishStatusFilter === "all" ||
        report.publishStatus === filters.selectedPublishStatusFilter)
    )
  })
}
