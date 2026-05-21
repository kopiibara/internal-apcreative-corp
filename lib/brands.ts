import "server-only"

import { query } from "@/lib/db"

export type BrandStatusFilter = "all" | "active" | "inactive"

export type Brand = {
  id: number
  name: string
  slug: string
  description: string | null
  brandImageUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type BrandRow = {
  id: number
  name: string
  slug: string
  description: string | null
  brand_image_url: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

function mapBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    brandImageUrl: row.brand_image_url,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function getBrands() {
  const result = await query<BrandRow>(
    `
    SELECT
      id,
      name,
      slug,
      description,
      brand_image_url,
      is_active,
      created_at,
      updated_at
    FROM brand
    ORDER BY name ASC, id ASC
    `
  )

  return result.rows.map(mapBrand)
}

export async function getBrandById(brandId: number) {
  const result = await query<BrandRow>(
    `
    SELECT
      id,
      name,
      slug,
      description,
      brand_image_url,
      is_active,
      created_at,
      updated_at
    FROM brand
    WHERE id = $1
    LIMIT 1
    `,
    [brandId]
  )

  const row = result.rows[0]

  return row ? mapBrand(row) : null
}
