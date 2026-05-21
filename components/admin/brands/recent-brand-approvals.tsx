import { BrandApprovalCard } from "@/components/admin/brands/brand-approval-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getApprovalKanbanStage } from "@/lib/approval-kanban"
import type { RecentBrandApproval } from "@/lib/brand-analytics"
import { getKanbanStageConfig } from "@/lib/approval-kanban-status"
import type { ApprovalKanbanColumnId } from "@/lib/approval-statuses"
import { cn } from "@/lib/utils"

type RecentBrandApprovalsProps = {
  approvals: RecentBrandApproval[]
}

const brandApprovalStages: {
  id: ApprovalKanbanColumnId
  title: string
}[] = [
    { id: "pending", title: "Pending" },
    { id: "revision", title: "Revision" },
    { id: "rejected", title: "Rejected" },
    { id: "supervisor-approved", title: "Supervisor Approved" },
    { id: "approved", title: "Approved" },
  ]

function getBrandApprovalStage(approval: RecentBrandApproval) {
  const stage = getApprovalKanbanStage(approval)

  return stage === "scheduled" || stage === "published" ? "approved" : stage
}

export function RecentBrandApprovals({ approvals }: RecentBrandApprovalsProps) {
  if (approvals.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No recent approval requests for this brand.
      </div>
    )
  }

  const approvalsByStage = brandApprovalStages.reduce<
    Record<ApprovalKanbanColumnId, RecentBrandApproval[]>
  >(
    (groups, stage) => {
      groups[stage.id] = []
      return groups
    },
    {
      pending: [],
      revision: [],
      rejected: [],
      "supervisor-approved": [],
      approved: [],
      scheduled: [],
      published: [],
    }
  )

  for (const approval of approvals) {
    const stage = getBrandApprovalStage(approval)

    if (stage in approvalsByStage) {
      approvalsByStage[stage].push(approval)
    }
  }

  return (
    <ScrollArea className="w-full pb-3" scrollbars="horizontal">
      <div className="flex w-max min-w-full gap-3 px-1">
        {brandApprovalStages.map((stage) => {
          const stageApprovals = approvalsByStage[stage.id]
          const config = getKanbanStageConfig(stage.id)

          return (
            <section
              key={stage.id}
              className="flex h-[360px] w-70 flex-col rounded-xl border-2 border-border bg-card"
            >
              <div className="shrink-0 border-b-2 border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{stage.title}</p>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs",
                      config.badgeClassName
                    )}
                  >
                    {stageApprovals.length}
                  </span>
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1 p-1" scrollbars="vertical">
                <div className="space-y-3 pr-3 p-2">
                  {stageApprovals.length === 0 ? (
                    <p className="rounded-lg border-2 border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      No requests.
                    </p>
                  ) : (
                    stageApprovals.map((approval) => (
                      <BrandApprovalCard
                        key={approval.id}
                        approval={approval}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </section>
          )
        })}
      </div>
    </ScrollArea>
  )
}
