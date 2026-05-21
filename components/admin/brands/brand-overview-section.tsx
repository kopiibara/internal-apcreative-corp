import { BrandAnalyticsBentoGrid } from "@/components/admin/brands/brand-analytics-bento-grid"
import { BrandProfileCard } from "@/components/admin/brands/brand-profile-card"
import type {
  BrandPermissionFlags,
  BrandWithAnalytics,
} from "@/components/admin/brands/types"
import { ScrollArea } from "@/components/ui/scroll-area"

type BrandOverviewSectionProps = {
  brand: BrandWithAnalytics
  permissions: BrandPermissionFlags
}

function OverviewRow({
  brand,
  permissions,
  className,
}: BrandOverviewSectionProps & { className?: string }) {
  return (
    <div className={className}>
      <div className="h-full w-[260px] shrink-0 sm:w-[280px] lg:w-auto lg:min-w-0">
        <BrandProfileCard brand={brand} permissions={permissions} />
      </div>
      {permissions.canViewAnalytics ? (
        <div className="h-full min-h-0 min-w-[480px] flex-1 lg:min-w-0">
          <BrandAnalyticsBentoGrid metrics={brand.metrics} className="h-full" />
        </div>
      ) : null}
    </div>
  )
}

export function BrandOverviewSection({
  brand,
  permissions,
}: BrandOverviewSectionProps) {
  return (
    <div className="min-w-0 overflow-hidden">
      <OverviewRow
        brand={brand}
        permissions={permissions}
        className="hidden min-h-0 min-w-0 items-stretch gap-4 lg:grid lg:grid-cols-[minmax(360px,1fr)_2fr]"
      />

      <ScrollArea className="w-full pb-2 lg:hidden" scrollbars="horizontal">
        <OverviewRow
          brand={brand}
          permissions={permissions}
          className="flex h-full w-max items-stretch gap-3 p-1"
        />
      </ScrollArea>
    </div>
  )
}
