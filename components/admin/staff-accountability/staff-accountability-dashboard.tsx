"use client"

import { StaffAccountabilityFilterBar } from "@/components/admin/staff-accountability/staff-accountability-filter-bar"
import {
  StaffAccountabilityBrandSummary,
  StaffAccountabilityCompletionChart,
  StaffAccountabilityLeaderboard,
} from "@/components/admin/staff-accountability/staff-accountability-charts-section"
import { StaffAccountabilitySummaryCards } from "@/components/admin/staff-accountability/staff-accountability-summary-cards"
import type {
  DailyReportBrandOption,
  DailyReportEmployeeOption,
} from "@/lib/daily-reports/daily-reports"
import type { StaffAccountabilityData } from "@/lib/tasks/tasks"

type StaffAccountabilityDashboardProps = {
  data: StaffAccountabilityData
  brands: DailyReportBrandOption[]
  employees: DailyReportEmployeeOption[]
  filters: {
    month: string
    brandId: string
    employeeId: string
  }
}

export function StaffAccountabilityDashboard({
  data,
  brands,
  employees,
  filters,
}: StaffAccountabilityDashboardProps) {
  return (
    <div className="min-w-0 space-y-6">
      <StaffAccountabilityFilterBar
        brands={brands}
        employees={employees}
        filters={filters}
      />

      <StaffAccountabilitySummaryCards data={data} />

      <div className="grid min-w-0 gap-4 lg:grid-cols-1 xl:grid-cols-1">
        <div className="min-w-0">
          <StaffAccountabilityLeaderboard summaries={data.summaries} />
        </div>

      </div>

      <StaffAccountabilityBrandSummary data={data} />
    </div>
  )
}

// Re-export for pages that imported TopSummaryCards directly.
export { StaffAccountabilitySummaryCards as TopSummaryCards } from "@/components/admin/staff-accountability/staff-accountability-summary-cards"
