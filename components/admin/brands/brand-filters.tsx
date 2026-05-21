"use client"

import { Search } from "lucide-react"

import type { BrandWithAnalytics } from "@/components/admin/brands/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
      <div className="flex w-max min-w-full items-center gap-2 pr-3">
        <div className="relative min-w-[260px] md:min-w-[320px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search brands"
            className="h-9 pl-9"
          />
        </div>

        <span className="text-muted-foreground">|</span>

        <div className="flex items-center gap-2">

          {brands.map((brand) => (
            <Button
              key={brand.id}
              type="button"
              variant={
                selectedBrandFilter !== "all" && selectedBrandId === brand.id
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => setSelectedBrandFilter(String(brand.id))}
            >
              {brand.name}
            </Button>
          ))}
        </div>

        <span className="text-muted-foreground">|</span>

        <div className="flex items-center gap-2">
          {(["active", "inactive"] as const).map((status) => (
            <Button
              key={status}
              type="button"
              variant={selectedStatusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setSelectedStatusFilter(
                  selectedStatusFilter === status ? "all" : status
                )
              }
            >
              {statusLabels[status]}
            </Button>
          ))}
        </div>

        <span className="text-muted-foreground">|</span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 whitespace-nowrap"
          onClick={resetBrandFilters}
        >
          Reset Filters
        </Button>
      </div>
    </ScrollArea>
  )
}
