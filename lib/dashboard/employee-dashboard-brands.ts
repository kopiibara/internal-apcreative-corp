import { query } from "@/lib/db"
import type { DailyReportBrandOption } from "@/lib/daily-reports/daily-report-types"

export const ALL_BRAND_SLUG = "all-brand"

type AssignedBrandRow = {
  id: number
  name: string
  slug: string
  is_primary: boolean
}

export type EmployeeDashboardBrandContext = {
  brands: DailyReportBrandOption[]
  effectiveBrandId: number | null
  selectedBrandId: string
  showBrandFilter: boolean
  assignedBrandLabel?: string
}

export function parseDashboardBrandId(value: string | undefined) {
  if (!value || value === "all") {
    return null
  }

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

async function getActiveRealBrands() {
  const result = await query<DailyReportBrandOption>(
    `
    SELECT id, name
    FROM brand
    WHERE is_active = true
      AND slug <> $1
    ORDER BY name ASC, id ASC
    `,
    [ALL_BRAND_SLUG]
  )

  return result.rows
}

async function getAssignedBrands(profileId: number) {
  const result = await query<AssignedBrandRow>(
    `
    SELECT b.id, b.name, b.slug, uba.is_primary
    FROM user_brand_access uba
    JOIN brand b ON b.id = uba.brand_id
    WHERE uba.profile_id = $1
      AND uba.is_active = true
      AND b.is_active = true
    ORDER BY uba.is_primary DESC, b.name ASC, b.id ASC
    `,
    [profileId]
  )

  return result.rows
}

function resolveSelectedBrandId(
  requestedBrandId: number | null,
  brands: DailyReportBrandOption[]
) {
  if (requestedBrandId == null) {
    return {
      effectiveBrandId: null,
      selectedBrandId: "all",
    }
  }

  const isAllowed = brands.some((brand) => brand.id === requestedBrandId)

  if (!isAllowed) {
    return {
      effectiveBrandId: null,
      selectedBrandId: "all",
    }
  }

  return {
    effectiveBrandId: requestedBrandId,
    selectedBrandId: String(requestedBrandId),
  }
}

export async function getEmployeeDashboardBrandContext(
  profileId: number,
  brandIdParam: string | undefined
): Promise<EmployeeDashboardBrandContext | null> {
  const assignments = await getAssignedBrands(profileId)

  if (assignments.length === 0) {
    return null
  }

  const hasAllBrandAccess = assignments.some(
    (assignment) => assignment.slug === ALL_BRAND_SLUG
  )
  const assignedRealBrands = assignments
    .filter((assignment) => assignment.slug !== ALL_BRAND_SLUG)
    .map((assignment) => ({
      id: assignment.id,
      name: assignment.name,
    }))
  const requestedBrandId = parseDashboardBrandId(brandIdParam)

  if (hasAllBrandAccess) {
    const brands = await getActiveRealBrands()
    const selection = resolveSelectedBrandId(requestedBrandId, brands)

    return {
      brands,
      showBrandFilter: true,
      ...selection,
    }
  }

  if (assignedRealBrands.length === 0) {
    return null
  }

  if (assignedRealBrands.length === 1) {
    const [brand] = assignedRealBrands

    return {
      brands: [],
      effectiveBrandId: brand.id,
      selectedBrandId: String(brand.id),
      showBrandFilter: false,
      assignedBrandLabel: brand.name,
    }
  }

  const selection = resolveSelectedBrandId(requestedBrandId, assignedRealBrands)

  return {
    brands: assignedRealBrands,
    showBrandFilter: true,
    ...selection,
  }
}
