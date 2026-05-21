"use client"

import { ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"

import { ApprovalStatusBadges } from "@/components/admin/approvals/approval-status-badges"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { RecentBrandApproval } from "@/lib/brand-analytics"
import { cn } from "@/lib/utils"

type BrandApprovalCardProps = {
  approval: RecentBrandApproval
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export function BrandApprovalCard({ approval }: BrandApprovalCardProps) {
  const router = useRouter()

  function handleCardClick() {
    router.push(`/admin/approvals?approvalId=${approval.id}`)
  }

  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleCardClick()
        }
      }}
      className={cn(
        "cursor-pointer rounded-md bg-card/50 py-2 transition-colors",
        "hover:border-primary/40 hover:bg-card/80"
      )}
    >
      <CardContent className="space-y-3 p-0">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{approval.submittedByName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {dateFormatter.format(new Date(approval.dateSubmitted))}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{approval.contentType}</Badge>
          <Badge variant="outline">{approval.platform}</Badge>
        </div>

        {approval.assetLink ? (
          <a
            href={approval.assetLink}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
          >
            Open asset
            <ExternalLink className="size-3" />
          </a>
        ) : null}

        <ApprovalStatusBadges
          supervisorStatus={approval.supervisorStatus}
          directorStatus={approval.directorStatus}
          publishStatus={approval.publishStatus}
          compact
        />
      </CardContent>
    </Card>
  )
}
