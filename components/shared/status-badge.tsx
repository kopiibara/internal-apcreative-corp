"use client"

import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import {
  formatStatusLabel,
  getStatusBadgeClassName,
  type StatusBadgeType,
} from "@/lib/ui/status-badge"
import { cn } from "@/lib/utils"

export type StatusBadgeProps = {
  status: string | null | undefined
  type?: StatusBadgeType
  className?: string
  size?: "default" | "sm"
  prefix?: string
  children?: ReactNode
}

export function StatusBadge({
  status,
  type = "default",
  className,
  size = "default",
  prefix,
  children,
}: StatusBadgeProps) {
  const label = children ?? formatStatusLabel(status)
  const displayLabel = prefix ? `${prefix}: ${label}` : label

  return (
    <Badge
      variant="outline"
      size={size}
      className={cn(
        "border-2 shadow-none",
        getStatusBadgeClassName(status, type),
        className
      )}
    >
      {displayLabel}
    </Badge>
  )
}
