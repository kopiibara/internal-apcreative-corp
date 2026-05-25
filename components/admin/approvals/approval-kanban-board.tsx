"use client"

import { useEffect, useMemo } from "react"
import { toast } from "sonner"

import { ApprovalDataTable } from "@/components/admin/approvals/approval-data-table"
import { ApprovalDeepLinkOpener } from "@/components/admin/approvals/approval-deep-link-opener"
import { ApprovalDetailsSheet } from "@/components/admin/approvals/approval-details-sheet"
import { ApprovalFilters } from "@/components/admin/approvals/approval-filters"
import { ApprovalKanbanCard } from "@/components/admin/approvals/approval-kanban-card"
import { ApprovalKanbanColumn } from "@/components/admin/approvals/approval-kanban-column"
import { ApprovalVerificationDialog } from "@/components/admin/approvals/approval-verification-dialog"
import { BoardSection } from "@/components/shared/board-section"
import {
  KanbanBoardShell,
  KANBAN_BOARD_SCROLL_ROW_CLASS,
  KANBAN_OVERLAY_CLASS,
} from "@/components/shared/kanban-board-scroll"
import {
  Kanban,
  KanbanBoard,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanMoveEvent,
} from "@/components/reui/kanban"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { getApprovalKanbanStage } from "@/lib/approvals/approval-kanban"
import {
  filterApprovalReports,
  mergeApprovalReports,
} from "@/lib/approvals/approval-filters"
import { getVisibleApprovalKanbanColumns } from "@/lib/approvals/approval-statuses"
import type { AccountType } from "@/lib/auth/auth-session"
import { cn } from "@/lib/utils"
import { useApprovalStore } from "@/stores/use-approval-store"
import {
  canEditPublishingFields,
  type ContentReport,
} from "@/types/content-report"

type ApprovalKanbanBoardProps = {
  reports: ContentReport[]
  accountType: AccountType
  canSupervisorReview: boolean
  canDirectorReview: boolean
  canPublishUpdate: boolean
  approvalId?: string
}

function buildColumns(
  reports: ContentReport[],
  columnsToShow: ReturnType<typeof getVisibleApprovalKanbanColumns>
) {
  return columnsToShow.reduce<Record<string, ContentReport[]>>(
    (columns, column) => {
      columns[column.id] = reports.filter(
        (report) => getApprovalKanbanStage(report) === column.id
      )
      return columns
    },
    {}
  )
}

export function ApprovalKanbanBoard({
  reports,
  accountType,
  canSupervisorReview,
  canDirectorReview,
  canPublishUpdate,
  approvalId,
}: ApprovalKanbanBoardProps) {
  const {
    activeView,
    searchQuery,
    selectedBrandFilter,
    selectedContentTypeFilter,
    selectedPlatformFilter,
    selectedSupervisorStatusFilter,
    selectedDirectorStatusFilter,
    selectedPublishStatusFilter,
    approvalPatches,
    openDetailsSheet,
    openVerificationDialog,
    setActiveView,
    updateApprovalInStore,
    reconcileApprovalPatches,
  } = useApprovalStore()

  useEffect(() => {
    reconcileApprovalPatches(reports)
  }, [reports, reconcileApprovalPatches])

  const currentReports = useMemo(
    () => mergeApprovalReports(reports, approvalPatches),
    [reports, approvalPatches]
  )

  const filteredReports = useMemo(() => {
    return filterApprovalReports(currentReports, {
      searchQuery,
      selectedBrandFilter,
      selectedContentTypeFilter,
      selectedPlatformFilter,
      selectedSupervisorStatusFilter,
      selectedDirectorStatusFilter,
      selectedPublishStatusFilter,
    })
  }, [
    currentReports,
    searchQuery,
    selectedBrandFilter,
    selectedContentTypeFilter,
    selectedDirectorStatusFilter,
    selectedPlatformFilter,
    selectedPublishStatusFilter,
    selectedSupervisorStatusFilter,
  ])

  const visibleColumns = useMemo(
    () =>
      getVisibleApprovalKanbanColumns({
        accountType,
        canSupervisorReview,
        canDirectorReview,
        canPublishUpdate,
      }),
    [accountType, canDirectorReview, canPublishUpdate, canSupervisorReview]
  )

  const columns = useMemo(
    () => buildColumns(filteredReports, visibleColumns),
    [filteredReports, visibleColumns]
  )

  const boardSyncKey = useMemo(
    () =>
      filteredReports
        .map(
          (report) =>
            `${report.id}:${report.supervisorStatus}:${report.directorStatus}:${report.publishStatus}`
        )
        .join("|"),
    [filteredReports]
  )

  function handleMove({
    activeContainer,
    overContainer,
    activeIndex,
  }: KanbanMoveEvent) {
    if (activeContainer === overContainer) {
      return
    }

    const report = columns[activeContainer]?.[activeIndex]

    if (!report) {
      return
    }

    const isDirectorCompletingRevision =
      report.supervisorStatus === "Approved" &&
      report.directorStatus === "Revision" &&
      (overContainer === "supervisor-approved" || overContainer === "ready-to-publish")

    if (
      (overContainer === "pending" ||
        (overContainer === "supervisor-approved" && !isDirectorCompletingRevision)) &&
      !canSupervisorReview
    ) {
      toast.error("You do not have permission to update Supervisor Review.")
      return
    }

    if (overContainer === "revision" || overContainer === "rejected") {
      const isDirectorStage = report.supervisorStatus === "Approved"

      if (isDirectorStage && !canDirectorReview) {
        toast.error("You do not have permission to perform Director Review.")
        return
      }

      if (!isDirectorStage && !canSupervisorReview) {
        toast.error("You do not have permission to update Supervisor Review.")
        return
      }
    }

    if (overContainer === "ready-to-publish" && !canDirectorReview) {
      toast.error("You do not have permission to perform Director Review.")
      return
    }

    if (
      (overContainer === "scheduled" || overContainer === "published") &&
      (!canPublishUpdate || !canEditPublishingFields(report))
    ) {
      toast.error("You do not have permission to update Publishing.")
      return
    }

    openVerificationDialog({
      type: "kanban",
      report,
      fromColumn: activeContainer,
      toColumn: overContainer,
      notes: "",
      onSaved: (updatedApproval) => {
        if (updatedApproval) {
          updateApprovalInStore(updatedApproval)
        }
      },
    })
  }

  const approvalBoardRowClass = cn(
    KANBAN_BOARD_SCROLL_ROW_CLASS,
    "px-3 pb-1 sm:px-6"
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <ApprovalDeepLinkOpener reports={currentReports} approvalId={approvalId} />

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal">Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review submissions through the approval workflow and update
            publishing once both approvals are complete.
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-start gap-3 lg:shrink-0 lg:justify-end">
          <Tabs
            value={activeView}
            onValueChange={(value) =>
              setActiveView(value as "kanban" | "table")
            }
            className="w-auto shrink-0"
          >
            <TabsList>
              <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
              <TabsTrigger value="table">Table View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as "kanban" | "table")}
      >
        <TabsContent value="kanban" className="mt-0 min-w-0 overflow-hidden">
          <BoardSection className="w-full min-w-0 overflow-hidden pb-1 gap-2">
            <CardHeader className="min-w-0 shrink-0 gap-3">
              <CardTitle className="text-card-foreground">
                Content approval
              </CardTitle>
              <ApprovalFilters reports={currentReports} />
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden px-0 pb-0">
              <KanbanBoardShell>
                <Kanban
                  key={boardSyncKey}
                  value={columns}
                  onValueChange={() => undefined}
                  getItemValue={(report) => String(report.id)}
                  onMove={handleMove}
                >
                  <KanbanBoard className={approvalBoardRowClass}>
                    {visibleColumns.map((column) => (
                      <ApprovalKanbanColumn
                        key={column.id}
                        id={column.id}
                        title={column.title}
                        count={columns[column.id]?.length ?? 0}
                      >
                        {(columns[column.id] ?? []).map((report) => (
                          <KanbanItem
                            key={`${report.id}-${report.supervisorStatus}-${report.directorStatus}-${report.publishStatus}`}
                            value={String(report.id)}
                          >
                            <KanbanItemHandle>
                              <ApprovalKanbanCard
                                report={report}
                                onClick={() => {
                                  const merged =
                                    currentReports.find(
                                      (entry) => entry.id === report.id
                                    ) ?? report
                                  openDetailsSheet(merged)
                                }}
                              />
                            </KanbanItemHandle>
                          </KanbanItem>
                        ))}
                      </ApprovalKanbanColumn>
                    ))}
                  </KanbanBoard>
                  <KanbanOverlay className={KANBAN_OVERLAY_CLASS} />
                </Kanban>
              </KanbanBoardShell>
            </CardContent>
          </BoardSection>
        </TabsContent>

        <TabsContent value="table" className="mt-0 min-w-0 overflow-hidden">
          <Card className="w-full min-w-0 overflow-hidden">
            <CardHeader className="gap-3">
              <CardTitle className="text-card-foreground">
                Content approval
              </CardTitle>
              <ApprovalFilters reports={currentReports} />
            </CardHeader>
            <CardContent className="min-w-0">
              <ApprovalDataTable
                reports={currentReports}
                canSupervisorReview={canSupervisorReview}
                canDirectorReview={canDirectorReview}
                canPublishUpdate={canPublishUpdate}
                showHeader={false}
                embedded
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ApprovalDetailsSheet
        reports={reports}
        accountType={accountType}
        canSupervisorReview={canSupervisorReview}
        canDirectorReview={canDirectorReview}
        canPublishUpdate={canPublishUpdate}
      />
      <ApprovalVerificationDialog onApprovalUpdated={updateApprovalInStore} />
    </div>
  )
}
