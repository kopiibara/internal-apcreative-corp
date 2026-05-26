"use client"

import { Search } from "lucide-react"

import type { BrandWithAnalytics } from "@/components/admin/brands/types"
import { FilterBadge } from "@/components/shared/filter-badge"
import { FilterBadgeGroup } from "@/components/shared/filter-badge-group"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
    <ScrollArea className="w-full pb-2" scrollbars="horizontal">
      <div className="flex w-max min-w-full items-center gap-2 py-1 pr-1">
        <div className="relative shrink-0 min-w-[220px] sm:min-w-[260px] md:min-w-[320px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search brands"
            className={cn("h-9 pl-9", neoInputClass)}
          />
        </div>

        <FilterBadgeGroup label="" className="min-w-0 shrink-0" scrollable>
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

        <FilterBadge
          active={selectedStatusFilter === "active"}
          onClick={() => {
            setSelectedStatusFilter(
              selectedStatusFilter === "active" ? "all" : "active",
            )
            setSelectedBrandFilter("all")
          }}
        >
          {statusLabels.active}
        </FilterBadge>

        <FilterBadge
          active={selectedStatusFilter === "inactive"}
          onClick={() => {
            setSelectedStatusFilter(
              selectedStatusFilter === "inactive" ? "all" : "inactive",
            )
            setSelectedBrandFilter("all")
          }}
        >
          {statusLabels.inactive}
        </FilterBadge>

        <Button
          type="button"
          variant="neutral"
          size="sm"
          className="h-9 shrink-0 whitespace-nowrap rounded-lg shadow-none hover:translate-x-0 hover:translate-y-0 hover:shadow-none active:translate-x-0 active:translate-y-0"
          onClick={resetBrandFilters}
        >
          Reset Filters
        </Button>
      </div>
    </ScrollArea>
  )
}
