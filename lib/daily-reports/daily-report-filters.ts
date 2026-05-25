import { z } from "zod"

export const PHILIPPINE_TIMEZONE = "Asia/Manila"

export const ALL_BRANDS_FILTER = "all"
export const ALL_EMPLOYEES_FILTER = "all"

export const dailyReportFiltersSchema = z.object({
  dateKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format."),
  brandId: z.coerce.number().int().positive().optional(),
  employeeId: z.coerce.number().int().positive().optional(),
})

export type DailyReportFiltersInput = z.infer<typeof dailyReportFiltersSchema>

export type DailyReportFilterBounds = {
  dateKey: string
  start: Date
  end: Date
  brandId: number | null
  employeeId: number | null
}

export function formatDateKeyInPhilippines(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PHILIPPINE_TIMEZONE,
  }).format(date)
}

export function getTodayDateKeyInPhilippines() {
  return formatDateKeyInPhilippines(new Date())
}

export function getPhilippineDayBounds(dateKey: string): {
  start: Date
  end: Date
} {
  const start = new Date(`${dateKey}T00:00:00+08:00`)
  const end = new Date(`${dateKey}T23:59:59.999+08:00`)

  return { start, end }
}

export function parseDailyReportFilters(
  input: DailyReportFiltersInput
): DailyReportFilterBounds {
  const parsed = dailyReportFiltersSchema.parse(input)
  const { start, end } = getPhilippineDayBounds(parsed.dateKey)

  return {
    dateKey: parsed.dateKey,
    start,
    end,
    brandId: parsed.brandId ?? null,
    employeeId: parsed.employeeId ?? null,
  }
}

export function toDailyReportFilterInput({
  dateKey,
  brandId,
  employeeId,
}: {
  dateKey: string
  brandId: string
  employeeId: string
}): DailyReportFiltersInput {
  return {
    dateKey,
    brandId:
      brandId === ALL_BRANDS_FILTER ? undefined : Number.parseInt(brandId, 10),
    employeeId:
      employeeId === ALL_EMPLOYEES_FILTER
        ? undefined
        : Number.parseInt(employeeId, 10),
  }
}
