import { DashboardFilterBar } from "@/components/admin/dashboard/dashboard-filter-bar"
import { BrandSummaryChart } from "@/components/admin/daily-reports/brand-summary-chart"
import { DailySummaryCards } from "@/components/admin/daily-reports/daily-summary-cards"
import { EmployeeSummaryChart } from "@/components/admin/daily-reports/employee-summary-chart"
import { TopSummaryCards } from "@/components/admin/staff-accountability/staff-accountability-dashboard"
import { getEmployeeDashboardBrandContext } from "@/lib/dashboard/employee-dashboard-brands"
import {
  getDashboardPeriodBounds,
  getDefaultDashboardWeekStart,
  parseDashboardDateKey,
  parseDashboardMonth,
  parseDashboardPeriod,
} from "@/lib/dashboard/dashboard-period"
import { getTodayDateKeyInPhilippines } from "@/lib/daily-reports/daily-report-filters"
import { getDailyReportData } from "@/lib/daily-reports/daily-reports"
import { requireEmployee } from "@/lib/auth/auth-session"
import { getStaffAccountabilityData } from "@/lib/tasks/tasks"

type EmployeeDashboardPageProps = {
  searchParams: Promise<{
    period?: string
    date?: string
    month?: string
    weekStart?: string
    brandId?: string
  }>
}

export default async function EmployeeDashboardPage({
  searchParams,
}: EmployeeDashboardPageProps) {
  const { profile } = await requireEmployee()
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
  const brandContext = await getEmployeeDashboardBrandContext(
    profile.id,
    params.brandId
  )
  const bounds = getDashboardPeriodBounds({
    period,
    dateKey,
    month,
    weekStartKey: weekStart,
  })

  if (!brandContext) {
    return (
      <div className="min-w-0 space-y-4 overflow-hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            My Brand Dashboard
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No active brand assignment was found for your account.
          </p>
        </div>
      </div>
    )
  }

  const [dailyReportData, staffAccountabilityData] = await Promise.all([
    getDailyReportData({
      dateKey,
      start: bounds.dailyStart,
      end: bounds.dailyEnd,
      brandId: brandContext.effectiveBrandId,
      employeeId: null,
    }),
    getStaffAccountabilityData({
      startDate: bounds.staffStart,
      endDate: bounds.staffEnd,
      brandId: brandContext.effectiveBrandId,
    }),
  ])

  const brandFilterLabel = brandContext.showBrandFilter
    ? brandContext.selectedBrandId === "all"
      ? "All Brands"
      : brandContext.brands.find(
          (brand) => String(brand.id) === brandContext.selectedBrandId
        )?.name
    : brandContext.assignedBrandLabel

  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            My Brand Dashboard
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {brandContext.showBrandFilter
              ? "View reports, approvals, and analytics across your assigned brands."
              : "View your assigned brand reports, approvals, and analytics."}
          </p>
        </div>
        <p className="rounded-lg border-2 border-border bg-background px-3 py-2 text-xs font-black uppercase tracking-[0.16em]">
          {bounds.label}
          {brandFilterLabel ? ` · ${brandFilterLabel}` : ""}
        </p>
      </div>

      <DashboardFilterBar
        brands={brandContext.brands}
        period={period}
        dateKey={dateKey}
        month={month}
        weekStart={weekStart}
        brandId={brandContext.selectedBrandId}
        showBrandFilter={brandContext.showBrandFilter}
        assignedBrandLabel={brandContext.assignedBrandLabel}
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

      <section className="grid min-w-0 grid-cols-1 gap-3 p-1 md:gap-4 xl:grid-cols-2">
        <BrandSummaryChart summaries={dailyReportData.brandSummaries} />
        <EmployeeSummaryChart summaries={dailyReportData.employeeSummaries} />
      </section>
    </div>
  )
}
