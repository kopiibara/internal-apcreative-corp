"use client"

import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
    <ScrollArea className="w-full pb-2" scrollbars="horizontal">
      <div className="flex w-max min-w-full items-center gap-2 pr-3">
        <DatePicker
          value={selectedDate}
          onChange={setSelectedDate}
          disabled={disabled}
        />

        <Select
          value={selectedBrandId}
          onValueChange={setSelectedBrandId}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 min-w-[160px]">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_BRANDS_FILTER}>All Brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={String(brand.id)}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedEmployeeId}
          onValueChange={setSelectedEmployeeId}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 min-w-[180px]">
            <SelectValue placeholder="Employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_EMPLOYEES_FILTER}>All Employees</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={String(employee.id)}>
                {employee.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={resetDailyReportFilters}
          disabled={disabled}
        >
          <RotateCcw className="size-4" />
          Reset
        </Button>
      </div>
    </ScrollArea>
  )
}
