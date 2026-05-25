import { BrandApprovalCard } from "@/components/admin/brands/brand-approval-card"
import { KanbanColumnHeader } from "@/components/shared/kanban-column-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getApprovalKanbanStage } from "@/lib/approvals/approval-kanban"
import type { RecentBrandApproval } from "@/lib/brands/brand-analytics"
import { getKanbanStageConfig } from "@/lib/approvals/approval-kanban-status"
import type { ApprovalKanbanColumnId } from "@/lib/approvals/approval-statuses"

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
    { id: "supervisor-approved", title: "Director Review" },
    { id: "ready-to-publish", title: "Ready to Publish" },
    { id: "scheduled", title: "Scheduled" },
    { id: "published", title: "Published" },
  ]

function getBrandApprovalStage(approval: RecentBrandApproval) {
  return getApprovalKanbanStage(approval)
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
      "ready-to-publish": [],
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
              <KanbanColumnHeader
                title={stage.title}
                count={stageApprovals.length}
                countClassName={config.badgeClassName}
              />
              <ScrollArea className="min-h-0 flex-1 p-2" scrollbars="vertical">
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
