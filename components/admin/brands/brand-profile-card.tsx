"use client"

import { StatusBadge } from "@/components/shared/status-badge"
import { BrandActionsMenu } from "@/components/admin/brands/brand-actions-menu"
import { BrandLogo } from "@/components/admin/brands/brand-logo"
import { BrandTotalRequestsStat } from "@/components/admin/brands/brand-total-requests-stat"
import type {
  BrandPermissionFlags,
  BrandWithAnalytics,
} from "@/components/admin/brands/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useBrandStore } from "@/stores/use-brand-store"

type BrandProfileCardProps = {
  brand: BrandWithAnalytics
  permissions: BrandPermissionFlags
}

export function BrandProfileCard({ brand, permissions }: BrandProfileCardProps) {
  const { openEditDialog, openDeactivateDialog } = useBrandStore()

  return (
    <Card className="h-full gap-2 shadow-none">
      <CardHeader className="gap-3 pb-3">
        <div className="flex min-w-0 gap-3">
          <BrandLogo
            name={brand.name}
            imageUrl={brand.brandImageUrl}
            className="size-12 shrink-0 sm:size-14"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base sm:text-lg">{brand.name}</CardTitle>
              <StatusBadge
                status={brand.isActive ? "ACTIVE" : "INACTIVE"}
                type="brand"
              />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              /{brand.slug}
            </p>
          </div>
        </div>
        <p className="line-clamp-4 text-xs text-muted-foreground sm:text-sm">
          {brand.description ?? "No description yet."}
        </p>
        {permissions.canViewAnalytics ? (
          <BrandTotalRequestsStat
            value={brand.metrics.totalRequests}
            className="mt-1"
          />
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        {permissions.canUpdate ? (
          <Button
            type="button"
            size="sm"
            onClick={() => openEditDialog(brand)}
          >
            Edit Brand
          </Button>
        ) : null}
        {permissions.canDeactivate ? (
          <Button
            type="button"
            variant={brand.isActive ? "destructive" : "neutral"}
            size="sm"
            onClick={() => openDeactivateDialog(brand)}
          >
            {brand.isActive ? "Deactivate" : "Reactivate"}
          </Button>
        ) : null}
        <BrandActionsMenu brand={brand} permissions={permissions} />
      </CardContent>
    </Card>
  )
}
