import type { StaffAccountabilitySummary } from "@/lib/tasks/tasks"

export function formatStaffPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}

export function getStaffInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function getStaffMonthOptions() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
  const now = new Date()
  const options = []

  for (let index = 0; index < 12; index += 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1),
    )
    const value = `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0")}`

    options.push({
      value,
      label: formatter.format(date),
    })
  }

  return options
}

export function getStaffBrandLabel(brands: StaffAccountabilitySummary["brands"]) {
  if (brands.length === 0) {
    return "No active brand"
  }

  if (brands.length <= 2) {
    return brands.map((brand) => brand.brandName).join(", ")
  }

  return `${brands
    .slice(0, 2)
    .map((brand) => brand.brandName)
    .join(", ")} +${brands.length - 2}`
}

export function getLeaderboardRankClass(rank: number) {
  if (rank === 1) {
    return "bg-yellow-400"
  }

  if (rank === 2) {
    return "bg-slate-300"
  }

  if (rank === 3) {
    return "bg-orange-400"
  }

  return "bg-muted/40"
}
