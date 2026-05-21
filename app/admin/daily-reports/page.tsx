import { DailyReportsDashboard } from "@/components/admin/daily-reports/daily-reports-dashboard"
import {
  getTodayDateKeyInPhilippines,
  parseDailyReportFilters,
} from "@/lib/daily-report-filters"
import {
  getDailyReportData,
  getDailyReportFilterOptions,
} from "@/lib/daily-reports"
import { requirePermission } from "@/lib/permissions"

export default async function AdminDailyReportsPage() {
  await requirePermission("daily_reports.view")

  const [{ brands, employees }, initialData] = await Promise.all([
    getDailyReportFilterOptions(),
    getDailyReportData(
      parseDailyReportFilters({
        dateKey: getTodayDateKeyInPhilippines(),
      })
    ),
  ])

  return (
    <DailyReportsDashboard
      initialData={initialData}
      brands={brands}
      employees={employees}
    />
  )
}
