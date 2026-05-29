"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { fetchDailyReportAction } from "@/app/admin/daily-reports/actions"
import { DailyReportFilters } from "@/components/admin/daily-reports/daily-report-filters"
import { BrandSummaryChart } from "@/components/admin/daily-reports/brand-summary-chart"
import { DailySummaryCards } from "@/components/admin/daily-reports/daily-summary-cards"
import { EmployeeSummaryChart } from "@/components/admin/daily-reports/employee-summary-chart"
import { DailyReportTimeline } from "@/components/admin/daily-reports/daily-report-timeline"
import {
  DailyReportApprovalLogTable,
  DailyReportBlockersSection,
  DailyReportTaskLogTable,
} from "@/components/admin/daily-reports/daily-report-tables"
import { toDailyReportFilterInput } from "@/lib/daily-reports/daily-report-filters"
import type {
  DailyReportBrandOption,
  DailyReportData,
  DailyReportEmployeeOption,
} from "@/lib/daily-reports/daily-report-types"
import { useDailyReportStore } from "@/stores/use-daily-report-store"

type DailyReportsDashboardProps = {
  initialData: DailyReportData
  brands: DailyReportBrandOption[]
  employees: DailyReportEmployeeOption[]
}

export function DailyReportsDashboard({
  initialData,
  brands,
  employees,
}: DailyReportsDashboardProps) {
  const [reportData, setReportData] = useState(initialData)
  const [isPending, startTransition] = useTransition()
  const skipInitialFetch = useRef(true)
  const { selectedDate, selectedBrandId, selectedEmployeeId } =
    useDailyReportStore()

  const loadReport = useCallback(() => {
    startTransition(async () => {
      const result = await fetchDailyReportAction(
        toDailyReportFilterInput({
          dateKey: selectedDate,
          brandId: selectedBrandId,
          employeeId: selectedEmployeeId,
        })
      )

      if (!result.success || !result.data) {
        toast.error(result.message)
        return
      }

      setReportData(result.data)
    })
  }, [selectedBrandId, selectedDate, selectedEmployeeId])

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false
      return
    }

    loadReport()
  }, [loadReport])

  return (
    <div className="min-w-0 space-y-4 overflow-hidden md:space-y-6">


      <DailyReportFilters
        brands={brands}
        employees={employees}
        disabled={isPending}
      />


      <div className="pr-1 flex flex-col gap-3 md:gap-4">
        <DailyReportTaskLogTable entries={reportData.taskLog} />
        <DailyReportApprovalLogTable entries={reportData.approvalLog} />

      </div>

      <div className="grid min-w-0 grid-cols-1 items-stretch gap-3 sm:grid-cols-2 md:gap-4 pr-1">
        <DailyReportBlockersSection
          blockers={reportData.blockers}
          missingItems={reportData.missingItems}
          alertSummary={reportData.alertSummary}
        />
        <DailyReportTimeline entries={reportData.timeline} />
      </div>
    </div>
  )
}
