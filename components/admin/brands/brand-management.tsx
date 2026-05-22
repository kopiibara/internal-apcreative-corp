"use client"

import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import {
  deactivateBrand,
  deleteBrand,
  reactivateBrand,
} from "@/app/admin/brands/actions"
import { BrandAnalyticsSheet } from "@/components/admin/brands/brand-analytics-sheet"
import { BrandFilters } from "@/components/admin/brands/brand-filters"
import { BrandFormDialog } from "@/components/admin/brands/brand-form-dialog"
import { BrandOverviewSection } from "@/components/admin/brands/brand-overview-section"
import { RecentBrandApprovals } from "@/components/admin/brands/recent-brand-approvals"
import type {
  BrandPermissionFlags,
  BrandWithAnalytics,
} from "@/components/admin/brands/types"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useBrandStore } from "@/stores/use-brand-store"

type BrandManagementProps = {
  brands: BrandWithAnalytics[]
  permissions: BrandPermissionFlags
}

export function BrandManagement({
  brands,
  permissions,
}: BrandManagementProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const {
    selectedBrand,
    isCreateDialogOpen,
    isEditDialogOpen,
    isDeactivateDialogOpen,
    isDeleteDialogOpen,
    isAnalyticsSheetOpen,
    searchQuery,
    selectedStatusFilter,
    selectedBrandFilter,
    openCreateDialog,
    closeCreateDialog,
    closeEditDialog,
    closeDeactivateDialog,
    closeDeleteDialog,
    closeAnalyticsSheet,
  } = useBrandStore()

  const filteredBrands = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return brands.filter((brand) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        brand.name.toLowerCase().includes(normalizedSearch) ||
        brand.slug.toLowerCase().includes(normalizedSearch)
      const matchesStatus =
        selectedStatusFilter === "all" ||
        (selectedStatusFilter === "active" && brand.isActive) ||
        (selectedStatusFilter === "inactive" && !brand.isActive)

      return matchesSearch && matchesStatus
    })
  }, [brands, searchQuery, selectedStatusFilter])

  const selectedViewBrand = useMemo(() => {
    const brandFromSelection = filteredBrands.find(
      (brand) => String(brand.id) === selectedBrandFilter
    )

    return brandFromSelection ?? filteredBrands[0] ?? null
  }, [filteredBrands, selectedBrandFilter])
  const selectedAnalyticsBrand =
    selectedBrand && "metrics" in selectedBrand
      ? (selectedBrand as BrandWithAnalytics)
      : brands.find((brand) => brand.id === selectedBrand?.id) ?? null

  function handleDeactivateToggle() {
    if (!selectedBrand) {
      return
    }

    startTransition(async () => {
      const result = selectedBrand.isActive
        ? await deactivateBrand({ brandId: selectedBrand.id })
        : await reactivateBrand({ brandId: selectedBrand.id })

      if (result.success) {
        toast.success(result.message)
        closeDeactivateDialog()
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  function handleDelete() {
    if (!selectedBrand) {
      return
    }

    startTransition(async () => {
      const result = await deleteBrand({ brandId: selectedBrand.id })

      if (result.success) {
        toast.success(result.message)
        closeDeleteDialog()
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <div className="min-w-0 space-y-4 rounded-xl bg-background p-1 md:p-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Brands</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage brands and view content approval performance.
          </p>
        </div>
        {permissions.canCreate ? (
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" />
            Add Brand
          </Button>
        ) : null}
      </div>

      <Card className="shadow-none">
        <CardHeader className="gap-3 border-b-2 border-border">
          <CardTitle className="font-semibold">Brand selector</CardTitle>
          <BrandFilters
            brands={filteredBrands}
            selectedBrandId={selectedViewBrand?.id ?? null}
          />
        </CardHeader>
      </Card>

      {selectedViewBrand ? (
        <>
          <BrandOverviewSection
            brand={selectedViewBrand}
            permissions={permissions}
          />

          <Card className="shadow-none">
            <CardHeader className="border-b-2 border-border">
              <CardTitle className="font-semibold">
                Recent Approval Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentBrandApprovals
                approvals={selectedViewBrand.recentApprovals}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      <BrandFormDialog
        key={`create-${isCreateDialogOpen}`}
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateDialog()
          }
        }}
      />
      <BrandFormDialog
        key={`edit-${selectedBrand?.id ?? "none"}-${isEditDialogOpen}`}
        mode="edit"
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditDialog()
          }
        }}
        brand={selectedBrand}
      />
      <BrandAnalyticsSheet
        brand={selectedAnalyticsBrand}
        open={isAnalyticsSheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeAnalyticsSheet()
          }
        }}
      />

      <AlertDialog
        open={isDeactivateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDeactivateDialog()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedBrand?.isActive ? "Deactivate brand?" : "Reactivate brand?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBrand?.isActive
                ? "The brand will stay available for historical reports, but it will no longer be active."
                : "The brand will become active again for account access and reporting."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button
              variant={selectedBrand?.isActive ? "destructive" : "default"}
              onClick={handleDeactivateToggle}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete brand?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete is only allowed when the brand has no related records. If it
              has reports or access records, deactivate it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
