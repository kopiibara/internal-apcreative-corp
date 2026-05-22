import type { ContentReport } from "@/types/content-report"

function approvalReviewStatusesMatch(a: ContentReport, b: ContentReport) {
  return (
    a.supervisorStatus === b.supervisorStatus &&
    a.directorStatus === b.directorStatus &&
    a.publishStatus === b.publishStatus
  )
}

function getReportTimestamp(report: ContentReport) {
  return new Date(report.updatedAt).getTime()
}

/** Prefer a client patch only when it is strictly newer than server props. */
export function shouldPreferApprovalPatch(
  server: ContentReport,
  patch: ContentReport
) {
  return getReportTimestamp(patch) > getReportTimestamp(server)
}

export function resolveApprovalReport(
  report: ContentReport,
  patches: Record<number, ContentReport>,
  serverReports?: ContentReport[]
) {
  const server =
    serverReports?.find((entry) => entry.id === report.id) ?? report

  return mergeApprovalReports([server], patches)[0]
}

/** Apply client-side approval patches from successful mutations (Kanban + table). */
export function mergeApprovalReports(
  reports: ContentReport[],
  patches: Record<number, ContentReport>
) {
  return reports.map((report) => {
    const patch = patches[report.id]

    if (!patch) {
      return report
    }

    return shouldPreferApprovalPatch(report, patch) ? patch : report
  })
}

/** Remove patches once server props caught up (after router.refresh). */
export function pruneSyncedApprovalPatches(
  reports: ContentReport[],
  patches: Record<number, ContentReport>
) {
  const serverById = new Map(reports.map((report) => [report.id, report]))
  const next: Record<number, ContentReport> = {}

  for (const [id, patch] of Object.entries(patches)) {
    const reportId = Number(id)
    const server = serverById.get(reportId)

    if (!server) {
      next[reportId] = patch
      continue
    }

    if (
      approvalReviewStatusesMatch(server, patch) &&
      getReportTimestamp(server) >= getReportTimestamp(patch)
    ) {
      continue
    }

    next[reportId] = patch
  }

  return next
}

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
