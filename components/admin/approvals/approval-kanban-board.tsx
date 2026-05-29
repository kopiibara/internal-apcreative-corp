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
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  getApprovalActionableCount,
  getApprovalKanbanStage,
  type ApprovalKanbanViewerContext,
} from "@/lib/approvals/approval-kanban"
import {
  filterApprovalReports,
  mergeApprovalReports,
} from "@/lib/approvals/approval-filters"
import { getVisibleApprovalKanbanColumns } from "@/lib/approvals/approval-statuses"
import type { AccountType } from "@/lib/auth/auth-session"
import { cn } from "@/lib/utils"
import { useApprovalPollingRefresh } from "@/hooks/use-approval-polling-refresh"
import { useApprovalStore } from "@/stores/use-approval-store"
import type { ContentReport } from "@/types/content-report"

type ApprovalKanbanBoardProps = {
  reports: ContentReport[]
  accountType: AccountType
  position?: string | null
  canSupervisorReview: boolean
  canDirectorReview: boolean
  canPublishUpdate: boolean
  approvalId?: string
}

function buildColumns(
  reports: ContentReport[],
  columnsToShow: ReturnType<typeof getVisibleApprovalKanbanColumns>,
  viewerContext: ApprovalKanbanViewerContext
) {
  return columnsToShow.reduce<Record<string, ContentReport[]>>(
    (columns, column) => {
      columns[column.id] = reports.filter(
        (report) => getApprovalKanbanStage(report, viewerContext) === column.id
      )
      return columns
    },
    {}
  )
}

export function ApprovalKanbanBoard({
  reports,
  accountType,
  position,
  canSupervisorReview,
  canDirectorReview,
  canPublishUpdate,
  approvalId,
}: ApprovalKanbanBoardProps) {
  useApprovalPollingRefresh()
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

  const viewerContext = useMemo(
    () => ({
      accountType,
      position,
      canSupervisorReview,
      canDirectorReview,
      canPublishUpdate,
    }),
    [accountType, canDirectorReview, canPublishUpdate, canSupervisorReview, position]
  )

  const columns = useMemo(
    () => buildColumns(filteredReports, visibleColumns, viewerContext),
    [filteredReports, visibleColumns, viewerContext]
  )

  const actionableCount = useMemo(
    () => getApprovalActionableCount(filteredReports, viewerContext),
    [filteredReports, viewerContext]
  )
  const hasNoReports = reports.length === 0

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

    if (!canSupervisorReview && !canDirectorReview) {
      toast.error("You do not have permission to update approval reviews.")
      return
    }

    if (overContainer === "published") {
      toast.error("Use the publishing form to mark an approval as Published.")
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

      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as "kanban" | "table")}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <BoardSection className="w-full min-w-0 flex-1 overflow-hidden pb-1 gap-2">
          <CardHeader className="min-w-0 shrink-0 gap-3">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="shrink-0 text-card-foreground">
                Approval board
              </CardTitle>

              {hasNoReports ? (
                <p className="min-w-0 flex-1 max-w-2xl rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-3 text-center text-sm text-muted-foreground">
                  No approval submissions yet. Reports will appear here once
                  brand officers submit creative work.
                </p>
              ) : null}

              <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-start gap-3 lg:justify-end">
                <TabsList>
                  <TabsTrigger value="kanban">
                    Kanban Board
                    {actionableCount > 0 ? (
                      <span className="ml-2 rounded-md border border-border bg-background px-1.5 text-xs">
                        {actionableCount}
                      </span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="table">Table View</TabsTrigger>
                </TabsList>
              </div>
            </div>

            <ApprovalFilters reports={currentReports} />
          </CardHeader>

          <TabsContent value="kanban" className="mt-0 min-w-0 overflow-hidden">
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
                                      (entry) => entry.id === report.id,
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
          </TabsContent>

          <TabsContent value="table" className="mt-0 min-w-0 overflow-hidden">
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
          </TabsContent>
        </BoardSection>
      </Tabs>

      <ApprovalDetailsSheet
        reports={reports}
        accountType={accountType}
        position={position}
        canSupervisorReview={canSupervisorReview}
        canDirectorReview={canDirectorReview}
        canPublishUpdate={canPublishUpdate}
      />
      <ApprovalVerificationDialog onApprovalUpdated={updateApprovalInStore} />
    </div>
  )
}
