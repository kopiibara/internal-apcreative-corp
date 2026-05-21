import { Badge } from "@/components/ui/badge"
import type { AssigneeBrandAccess } from "@/lib/tasks"

type TaskAssigneeBrandsProps = {
  brands: AssigneeBrandAccess[]
  className?: string
}

export function TaskAssigneeBrands({ brands, className }: TaskAssigneeBrandsProps) {
  if (brands.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">No active brand access</span>
    )
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className ?? ""}`}>
      {brands.map((brand) => (
        <Badge
          key={brand.brandId}
          variant={brand.isPrimary ? "default" : "outline"}
          className="text-[10px]"
        >
          {brand.brandName}
          {brand.isPrimary ? " · Primary" : ""}
        </Badge>
      ))}
    </div>
  )
}
