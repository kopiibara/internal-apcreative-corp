import { StaffAccountabilityDashboard } from "@/components/admin/staff-accountability/staff-accountability-dashboard"
import { getDailyReportFilterOptions } from "@/lib/daily-reports"
import { requirePermission } from "@/lib/permissions"
import { getStaffAccountabilityData } from "@/lib/tasks"

type StaffAccountabilityPageProps = {
  searchParams: Promise<{
    month?: string
    brandId?: string
    employeeId?: string
  }>
}

function getMonthBounds(month: string | undefined) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return { month: "all", startDate: null, endDate: null }
  }

  const [year, monthIndex] = month.split("-").map(Number)

  if (!year || !monthIndex || monthIndex < 1 || monthIndex > 12) {
    return { month: "all", startDate: null, endDate: null }
  }

  return {
    month,
    startDate: new Date(Date.UTC(year, monthIndex - 1, 1)),
    endDate: new Date(Date.UTC(year, monthIndex, 1)),
  }
}

function parseOptionalId(value: string | undefined) {
  if (!value || value === "all") {
    return null
  }

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export default async function StaffAccountabilityPage({
  searchParams,
}: StaffAccountabilityPageProps) {
  await requirePermission("tasks.view_all")
  const params = await searchParams
  const monthBounds = getMonthBounds(params.month)
  const brandId = parseOptionalId(params.brandId)
  const employeeId = parseOptionalId(params.employeeId)
  const [data, options] = await Promise.all([
    getStaffAccountabilityData({
      startDate: monthBounds.startDate,
      endDate: monthBounds.endDate,
      brandId,
      employeeId,
    }),
    getDailyReportFilterOptions(),
  ])

  return (
    <StaffAccountabilityDashboard
      data={data}
      brands={options.brands}
      employees={options.employees}
      filters={{
        month: monthBounds.month,
        brandId: brandId ? String(brandId) : "all",
        employeeId: employeeId ? String(employeeId) : "all",
      }}
    />
  )
}
