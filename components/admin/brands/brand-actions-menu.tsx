"use client"

import { BarChart3, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react"

import type {
  BrandPermissionFlags,
  BrandWithAnalytics,
} from "@/components/admin/brands/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useBrandStore } from "@/stores/use-brand-store"

type BrandActionsMenuProps = {
  brand: BrandWithAnalytics
  permissions: BrandPermissionFlags
}

export function BrandActionsMenu({
  brand,
  permissions,
}: BrandActionsMenuProps) {
  const {
    openAnalyticsSheet,
    openEditDialog,
    openDeactivateDialog,
    openDeleteDialog,
  } = useBrandStore()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Open brand actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {permissions.canViewAnalytics ? (
          <DropdownMenuItem onSelect={() => openAnalyticsSheet(brand)}>
            <BarChart3 className="size-4" />
            View Analytics
          </DropdownMenuItem>
        ) : null}
        {permissions.canUpdate ? (
          <DropdownMenuItem onSelect={() => openEditDialog(brand)}>
            <Pencil className="size-4" />
            Edit Brand
          </DropdownMenuItem>
        ) : null}
        {permissions.canDeactivate ? (
          <DropdownMenuItem
            variant={brand.isActive ? "destructive" : "default"}
            onSelect={() => openDeactivateDialog(brand)}
          >
            <Power className="size-4" />
            {brand.isActive ? "Deactivate" : "Reactivate"}
          </DropdownMenuItem>
        ) : null}
        {permissions.canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => openDeleteDialog(brand)}
            >
              <Trash2 className="size-4" />
              Delete Brand
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
