import { Badge } from "@/components/ui/badge"
import type { AssigneeBrandAccess } from "@/lib/tasks/tasks"
import { cn } from "@/lib/utils"

type TaskAssigneeBrandsProps = {
  brands: AssigneeBrandAccess[]
  hasAllBrandsAccess?: boolean
  className?: string
}

export function TaskAssigneeBrands({
  brands,
  hasAllBrandsAccess = false,
  className,
}: TaskAssigneeBrandsProps) {
  if (brands.length === 0 && !hasAllBrandsAccess) {
    return (
      <span className="text-xs text-muted-foreground">No active brand access</span>
    )
  }

  if (hasAllBrandsAccess) {
    return (
      <div className={cn("flex max-w-full flex-wrap gap-1", className)}>
        <Badge variant="default" className="max-w-full truncate text-[10px]">
          All brands
        </Badge>
      </div>
    )
  }

  return (
    <div className={cn("flex max-w-full flex-wrap gap-1", className)}>
      {brands.map((brand) => (
        <Badge
          key={brand.brandId}
          variant={brand.isPrimary ? "default" : "neutral"}
          className="max-w-full truncate text-[10px]"
        >
          {brand.brandName}
          {brand.isPrimary ? " · Primary" : ""}
        </Badge>
      ))}
    </div>
  )
}
