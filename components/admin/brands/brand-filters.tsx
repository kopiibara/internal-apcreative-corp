"use client"

import { Search } from "lucide-react"

import type { BrandWithAnalytics } from "@/components/admin/brands/types"
import { FilterBadge } from "@/components/shared/filter-badge"
import { FilterBadgeGroup } from "@/components/shared/filter-badge-group"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { neoInputClass } from "@/lib/ui/neo-ui"
import { useBrandStore } from "@/stores/use-brand-store"

type BrandFiltersProps = {
  brands: BrandWithAnalytics[]
  selectedBrandId: number | null
}

const statusLabels = {
  all: "All Brands",
  active: "Active Brands",
  inactive: "Inactive Brands",
} as const

export function BrandFilters({ brands, selectedBrandId }: BrandFiltersProps) {
  const {
    searchQuery,
    selectedStatusFilter,
    selectedBrandFilter,
    setSearchQuery,
    setSelectedStatusFilter,
    setSelectedBrandFilter,
    resetBrandFilters,
  } = useBrandStore()

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <FilterBadgeGroup label="" className="min-w-0">
        <FilterBadge
          active={selectedBrandFilter === "all"}
          onClick={() => setSelectedBrandFilter("all")}
        >
          All Brands
        </FilterBadge>

        {brands.map((brand) => (
          <FilterBadge
            key={brand.id}
            active={
              selectedBrandFilter !== "all" &&
              selectedBrandId === brand.id &&
              selectedBrandFilter === String(brand.id)
            }
            onClick={() => setSelectedBrandFilter(String(brand.id))}
          >
            {brand.name}
          </FilterBadge>
        ))}
      </FilterBadgeGroup>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 sm:w-[260px] md:w-[320px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search brands"
            className={cn("h-9 pl-9", neoInputClass)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["active", "inactive"] as const).map((status) => (
            <FilterBadge
              key={status}
              active={selectedStatusFilter === status}
              onClick={() => {
                setSelectedStatusFilter(
                  selectedStatusFilter === status ? "all" : status
                )
                setSelectedBrandFilter("all")
              }}
            >
              {statusLabels[status]}
            </FilterBadge>
          ))}

          <Button
            type="button"
            variant="neutral"
            size="sm"
            className="h-9 whitespace-nowrap rounded-lg shadow-none hover:translate-x-0 hover:translate-y-0 hover:shadow-none active:translate-x-0 active:translate-y-0"
            onClick={resetBrandFilters}
          >
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  )
}
