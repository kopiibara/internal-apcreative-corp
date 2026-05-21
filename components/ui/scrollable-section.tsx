"use client"

import type { ComponentProps } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type ScrollableSectionProps = ComponentProps<typeof ScrollArea>

export function ScrollableSection({
  className,
  children,
  ...props
}: ScrollableSectionProps) {
  return (
    <ScrollArea className={cn("min-h-0 flex-1", className)} {...props}>
      {children}
    </ScrollArea>
  )
}
