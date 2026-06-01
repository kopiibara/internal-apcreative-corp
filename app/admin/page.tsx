import { DashboardFilterBar } from "@/components/admin/dashboard/dashboard-filter-bar"
import { BrandSummaryChart } from "@/components/admin/daily-reports/brand-summary-chart"
import { DailySummaryCards } from "@/components/admin/daily-reports/daily-summary-cards"
import { EmployeeSummaryChart } from "@/components/admin/daily-reports/employee-summary-chart"
import { TopSummaryCards } from "@/components/admin/staff-accountability/staff-accountability-dashboard"
import {
  getDailyReportData,
  getDailyReportFilterOptions,
} from "@/lib/daily-reports/daily-reports"
import {
  getDashboardPeriodBounds,
  getDefaultDashboardWeekStart,
  parseDashboardDateKey,
  parseDashboardMonth,
  parseDashboardPeriod,
} from "@/lib/dashboard/dashboard-period"
import { getTodayDateKeyInPhilippines } from "@/lib/daily-reports/daily-report-filters"
import { getStaffAccountabilityData } from "@/lib/tasks/tasks"

type AdminDashboardPageProps = {
  searchParams: Promise<{
    period?: string
    date?: string
    month?: string
    weekStart?: string
    brandId?: string
  }>
}

function parseOptionalId(value: string | undefined) {
  if (!value || value === "all") {
    return null
  }

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const params = await searchParams
  const todayKey = getTodayDateKeyInPhilippines()
  const currentMonth = todayKey.slice(0, 7)
  const period = parseDashboardPeriod(params.period)
  const dateKey = parseDashboardDateKey(params.date, todayKey)
  const month = parseDashboardMonth(params.month, currentMonth)
  const weekStart = parseDashboardDateKey(
    params.weekStart,
    getDefaultDashboardWeekStart(todayKey)
  )
  const brandId = parseOptionalId(params.brandId)
  const bounds = getDashboardPeriodBounds({
    period,
    dateKey,
    month,
    weekStartKey: weekStart,
  })
  const [{ brands }, dailyReportData, staffAccountabilityData] =
    await Promise.all([
      getDailyReportFilterOptions(),
      getDailyReportData({
        dateKey,
        start: bounds.dailyStart,
        end: bounds.dailyEnd,
        brandId,
        employeeId: null,
      }),
      getStaffAccountabilityData({
        startDate: bounds.staffStart,
        endDate: bounds.staffEnd,
        brandId,
      }),
    ])

  return (
    <div className="min-w-0 space-y-4 overflow-hidden">


      <DashboardFilterBar
        brands={brands}
        period={period}
        dateKey={dateKey}
        month={month}
        weekStart={weekStart}
        brandId={brandId ? String(brandId) : "all"}
      />

      <section className="space-y-3 pr-1">
        <div>
          <h3 className="text-lg font-bold">Staff Accountability</h3>
        </div>
        <TopSummaryCards data={staffAccountabilityData} />
      </section>

      <section className="space-y-3 pr-1">
        <div>
          <h3 className="text-lg font-bold">Daily Reports</h3>
        </div>
        <DailySummaryCards summary={dailyReportData.summary} />
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-3 md:gap-4 xl:grid-cols-2 p-1">
        <BrandSummaryChart summaries={dailyReportData.brandSummaries} />
        <EmployeeSummaryChart summaries={dailyReportData.employeeSummaries} />
      </section>
    </div>
  )
}
