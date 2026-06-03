"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBadge } from "@/components/shared/filter-badge"
import { FilterBadgeGroup } from "@/components/shared/filter-badge-group"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  DailyReportBrandOption,
  DailyReportEmployeeOption,
} from "@/lib/daily-reports/daily-reports"
import { getStaffMonthOptions } from "@/lib/staff-accountability/format"

type StaffAccountabilityFilterBarProps = {
  brands: DailyReportBrandOption[]
  employees: DailyReportEmployeeOption[]
  filters: {
    month: string
    brandId: string
    employeeId: string
  }
}

export function StaffAccountabilityFilterBar({
  brands,
  employees,
  filters,
}: StaffAccountabilityFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateFilter(key: "month" | "brandId" | "employeeId", value: string) {
    const nextParams = new URLSearchParams(searchParams.toString())

    if (value === "all") {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }

    router.push(`${pathname}?${nextParams.toString()}`)
  }

  return (
    <div className="relative z-20 flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between p-1">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
        <Select
          value={filters.month}
          onValueChange={(value) => updateFilter("month", value)}
        >
          <SelectTrigger
            aria-label="Filter by month"
            className="h-9 w-fit min-w-[150px] rounded-full"
          >
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {getStaffMonthOptions().map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <FilterBadgeGroup label="" className="min-w-0">
          <FilterBadge
            active={filters.brandId === "all"}
            onClick={() => updateFilter("brandId", "all")}
          >
            All Brands
          </FilterBadge>
          {brands.map((brand) => (
            <FilterBadge
              key={brand.id}
              active={filters.brandId === String(brand.id)}
              onClick={() => updateFilter("brandId", String(brand.id))}
            >
              {brand.name}
            </FilterBadge>
          ))}
        </FilterBadgeGroup>

        <Select
          value={filters.employeeId}
          onValueChange={(value) => updateFilter("employeeId", value)}
        >
          <SelectTrigger
            aria-label="Filter by staff"
            className="h-9 w-fit min-w-[170px] rounded-full"
          >
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All staff</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={String(employee.id)}>
                {employee.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button asChild size="sm" className="h-9 w-fit shrink-0">
        <Link href="/admin/staff-accountability">Reset filters</Link>
      </Button>
    </div>
  )
}
