"use client"

import { BarChart3, CheckCheck, Clock, FileText } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { BrandActionsMenu } from "@/components/admin/brands/brand-actions-menu"
import { BrandLogo } from "@/components/admin/brands/brand-logo"
import type {
  BrandPermissionFlags,
  BrandWithAnalytics,
} from "@/components/admin/brands/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type BrandCardProps = {
  brand: BrandWithAnalytics
  permissions: BrandPermissionFlags
}

function MetricPill({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof FileText
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold leading-none">{value}</p>
    </div>
  )
}

export function BrandCard({ brand, permissions }: BrandCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <BrandLogo name={brand.name} imageUrl={brand.brandImageUrl} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-base">{brand.name}</CardTitle>
              <StatusBadge
                status={brand.isActive ? "ACTIVE" : "INACTIVE"}
                type="brand"
              />
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              /{brand.slug}
            </p>
          </div>
        </div>
        <BrandActionsMenu brand={brand} permissions={permissions} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {brand.description ?? "No description yet."}
        </p>
        {permissions.canViewAnalytics ? (
          <div className="grid grid-cols-2 gap-2">
            <MetricPill
              label="Requests"
              value={brand.metrics.totalRequests}
              icon={FileText}
            />
            <MetricPill
              label="Pending"
              value={brand.metrics.pending}
              icon={Clock}
            />
            <MetricPill
              label="Approved"
              value={brand.metrics.approved}
              icon={CheckCheck}
            />
            <MetricPill
              label="Published"
              value={brand.metrics.published}
              icon={BarChart3}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
