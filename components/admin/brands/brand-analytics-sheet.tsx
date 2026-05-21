"use client"

import { BrandApprovalSummary } from "@/components/admin/brands/brand-approval-summary"
import { BrandLogo } from "@/components/admin/brands/brand-logo"
import { RecentBrandApprovals } from "@/components/admin/brands/recent-brand-approvals"
import type { BrandWithAnalytics } from "@/components/admin/brands/types"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type BrandAnalyticsSheetProps = {
  brand: BrandWithAnalytics | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BrandAnalyticsSheet({
  brand,
  open,
  onOpenChange,
}: BrandAnalyticsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="h-svh w-[95vw] sm:w-[55vw]! sm:max-w-[55vw]!">
        <SheetHeader>
          <SheetTitle>Brand Analytics</SheetTitle>
          <SheetDescription>
            Content approval and posting workflow performance by brand.
          </SheetDescription>
        </SheetHeader>

        {brand ? (
          <ScrollArea className="min-h-0 flex-1" scrollbars="vertical">
            <div className="space-y-6 px-6 pb-6">
              <div className="flex items-start gap-3">
                <BrandLogo
                  name={brand.name}
                  imageUrl={brand.brandImageUrl}
                  className="size-16"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{brand.name}</h2>
                    <Badge variant={brand.isActive ? "default" : "outline"}>
                      {brand.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /{brand.slug}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {brand.description ?? "No description yet."}
                  </p>
                </div>
              </div>

              <BrandApprovalSummary metrics={brand.metrics} />

              <div className="space-y-3">
                <div>
                  <h3 className="font-medium">Recent Content Approvals</h3>
                  <p className="text-sm text-muted-foreground">
                    Latest requests submitted under this brand.
                  </p>
                </div>
                <RecentBrandApprovals approvals={brand.recentApprovals} />
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
