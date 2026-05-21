import { ImageIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type BrandLogoProps = {
  name: string
  imageUrl: string | null
  className?: string
}

export function BrandLogo({ name, imageUrl, className }: BrandLogoProps) {
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted/40",
        imageUrl ? "bg-cover bg-center" : "text-muted-foreground",
        className
      )}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      aria-label={`${name} logo`}
      role="img"
    >
      {imageUrl ? null : <ImageIcon className="size-5" />}
    </div>
  )
}
