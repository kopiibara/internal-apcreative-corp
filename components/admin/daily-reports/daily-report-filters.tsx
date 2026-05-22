"use client"

import { RotateCcw } from "lucide-react"

import { FilterBadge } from "@/components/shared/filter-badge"
import { FilterBadgeGroup } from "@/components/shared/filter-badge-group"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  ALL_BRANDS_FILTER,
  ALL_EMPLOYEES_FILTER,
} from "@/lib/daily-report-filters"
import type {
  DailyReportBrandOption,
  DailyReportEmployeeOption,
} from "@/lib/daily-report-types"
import { useDailyReportStore } from "@/stores/use-daily-report-store"

type DailyReportFiltersProps = {
  brands: DailyReportBrandOption[]
  employees: DailyReportEmployeeOption[]
  disabled?: boolean
}

export function DailyReportFilters({
  brands,
  employees,
  disabled = false,
}: DailyReportFiltersProps) {
  const {
    selectedDate,
    selectedBrandId,
    selectedEmployeeId,
    setSelectedDate,
    setSelectedBrandId,
    setSelectedEmployeeId,
    resetDailyReportFilters,
  } = useDailyReportStore()

  return (
    <div className="relative z-20 min-w-0 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DatePicker
          value={selectedDate}
          onChange={setSelectedDate}
          disabled={disabled}
        />
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <FilterBadgeGroup label="Brands" className="min-w-0">
            <FilterBadge
              active={selectedBrandId === ALL_BRANDS_FILTER}
              disabled={disabled}
              onClick={() => setSelectedBrandId(ALL_BRANDS_FILTER)}
            >
              All Brands
            </FilterBadge>
            {brands.map((brand) => (
              <FilterBadge
                key={brand.id}
                active={selectedBrandId === String(brand.id)}
                disabled={disabled}
                onClick={() => setSelectedBrandId(String(brand.id))}
              >
                {brand.name}
              </FilterBadge>
            ))}
          </FilterBadgeGroup>

          <FilterBadgeGroup label="Employees" className="min-w-0">
            <FilterBadge
              active={selectedEmployeeId === ALL_EMPLOYEES_FILTER}
              disabled={disabled}
              onClick={() => setSelectedEmployeeId(ALL_EMPLOYEES_FILTER)}
            >
              All Employees
            </FilterBadge>
            {employees.map((employee) => (
              <FilterBadge
                key={employee.id}
                active={selectedEmployeeId === String(employee.id)}
                disabled={disabled}
                onClick={() => setSelectedEmployeeId(String(employee.id))}
              >
                {employee.fullName}
              </FilterBadge>
            ))}
          </FilterBadgeGroup>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9"
          onClick={resetDailyReportFilters}
          disabled={disabled}
        >
          <RotateCcw className="size-4" />
          Reset
        </Button>
      </div>


    </div>
  )
}
