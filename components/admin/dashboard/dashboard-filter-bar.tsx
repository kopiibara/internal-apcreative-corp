"use client"

import { RotateCcw } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterBadge } from "@/components/shared/filter-badge"
import { FilterBadgeGroup } from "@/components/shared/filter-badge-group"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DailyReportBrandOption } from "@/lib/daily-reports/daily-report-types"

type DashboardPeriod = "daily" | "weekly" | "monthly"

type DashboardFilterBarProps = {
  brands: DailyReportBrandOption[]
  period: DashboardPeriod
  dateKey: string
  month: string
  weekStart: string
  brandId: string
}

const periodOptions: { value: DashboardPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

const weekFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

function getMonthOptions() {
  const now = new Date()
  const options = []

  for (let index = 0; index < 12; index += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1))
    const value = `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1
    ).padStart(2, "0")}`

    options.push({
      value,
      label: monthFormatter.format(date),
    })
  }

  return options
}

function getWeekOptions(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return []
  }

  const [year, monthNumber] = month.split("-").map(Number)
  const monthIndex = monthNumber - 1
  const firstDay = new Date(Date.UTC(year, monthIndex, 1))
  const firstDayIndex = firstDay.getUTCDay()
  const daysUntilMonday = firstDayIndex === 0 ? 1 : (8 - firstDayIndex) % 7
  const firstMonday = new Date(Date.UTC(year, monthIndex, 1 + daysUntilMonday))
  const options = []

  for (
    let date = firstMonday;
    date.getUTCMonth() === monthIndex;
    date = new Date(Date.UTC(year, monthIndex, date.getUTCDate() + 7))
  ) {
    const friday = new Date(Date.UTC(year, monthIndex, date.getUTCDate() + 4))
    const value = date.toISOString().slice(0, 10)

    options.push({
      value,
      label: `${weekFormatter.format(date)} - ${weekFormatter.format(friday)}`,
    })
  }

  return options
}

function firstWeekStartForMonth(month: string) {
  return getWeekOptions(month)[0]?.value ?? ""
}

export function DashboardFilterBar({
  brands,
  period,
  dateKey,
  month,
  weekStart,
  brandId,
}: DashboardFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const monthOptions = getMonthOptions()
  const weekOptions = getWeekOptions(month)

  function updateFilters(updates: Record<string, string | null>) {
    const nextParams = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") {
        nextParams.delete(key)
      } else {
        nextParams.set(key, value)
      }
    }

    router.push(`${pathname}?${nextParams.toString()}`)
  }

  return (
    <div className="relative z-20 flex min-w-0 flex-col gap-3 pr-1 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
        <FilterBadgeGroup label="" className="min-w-0">
          <FilterBadge
            active={brandId === "all"}
            onClick={() => updateFilters({ brandId: "all" })}
          >
            All Brands
          </FilterBadge>
          {brands.map((brand) => (
            <FilterBadge
              key={brand.id}
              active={brandId === String(brand.id)}
              onClick={() => updateFilters({ brandId: String(brand.id) })}
            >
              {brand.name}
            </FilterBadge>
          ))}
        </FilterBadgeGroup>


        <FilterBadgeGroup label="" className="min-w-0" scrollable={false}>
          {periodOptions.map((option) => (
            <FilterBadge
              key={option.value}
              active={period === option.value}
              onClick={() => {
                updateFilters({
                  period: option.value,
                  weekStart:
                    option.value === "weekly"
                      ? weekStart || firstWeekStartForMonth(month)
                      : null,
                })
              }}
            >
              {option.label}
            </FilterBadge>
          ))}
        </FilterBadgeGroup>

        {period === "daily" ? (
          <DatePicker
            value={dateKey}
            onChange={(nextDate) =>
              updateFilters({ period: "daily", date: nextDate })
            }
            className="h-9 w-fit max-w-full min-w-[160px] shrink-0"
          />
        ) : null}

        {period === "weekly" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={month}
              onValueChange={(nextMonth) => {
                updateFilters({
                  period: "weekly",
                  month: nextMonth,
                  weekStart: firstWeekStartForMonth(nextMonth),
                })
              }}
            >
              <SelectTrigger
                aria-label="Select month"
                className="h-9 w-fit min-w-[150px] rounded-full"
              >
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={weekStart}
              onValueChange={(nextWeekStart) =>
                updateFilters({
                  period: "weekly",
                  month,
                  weekStart: nextWeekStart,
                })
              }
            >
              <SelectTrigger
                aria-label="Select week"
                className="h-9 w-fit min-w-[170px] rounded-full"
              >
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {period === "monthly" ? (
          <Select
            value={month}
            onValueChange={(nextMonth) =>
              updateFilters({ period: "monthly", month: nextMonth })
            }
          >
            <SelectTrigger
              aria-label="Select month"
              className="h-9 w-fit min-w-[150px] rounded-full"
            >
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <Button
        type="button"
        size="sm"
        className="h-9 w-fit shrink-0"
        onClick={() => router.push(pathname)}
      >
        <RotateCcw className="size-4" />
        Reset
      </Button>
    </div>
  )
}
