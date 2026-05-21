"use client"

import { useMemo } from "react"

import { ApprovalDataTable } from "@/components/admin/approvals/approval-data-table"
import { ApprovalDeepLinkOpener } from "@/components/admin/approvals/approval-deep-link-opener"
import { ApprovalDetailsSheet } from "@/components/admin/approvals/approval-details-sheet"
import { ApprovalFilters } from "@/components/admin/approvals/approval-filters"
import { ApprovalKanbanCard } from "@/components/admin/approvals/approval-kanban-card"
import { ApprovalKanbanColumn } from "@/components/admin/approvals/approval-kanban-column"
import { ApprovalVerificationDialog } from "@/components/admin/approvals/approval-verification-dialog"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { getApprovalKanbanStage } from "@/lib/approval-kanban"
import { filterApprovalReports } from "@/lib/approval-filters"
import { getVisibleApprovalKanbanColumns } from "@/lib/approval-statuses"
import type { AccountType } from "@/lib/auth-session"
import { useApprovalStore } from "@/stores/use-approval-store"
import type { ContentReport } from "@/types/content-report"

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
  } = useApprovalStore()

  const currentReports = useMemo(
    () => reports.map((report) => approvalPatches[report.id] ?? report),
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

  return (
    <div className="min-h-0 min-w-0 space-y-4 overflow-hidden">
      <ApprovalDeepLinkOpener reports={currentReports} approvalId={approvalId} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review submissions through the approval workflow and update
            publishing once both approvals are complete.
          </p>
        </div>

        <Tabs
          value={activeView}
          onValueChange={(value) => setActiveView(value as "kanban" | "table")}
        >
          <TabsList>
            <TabsTrigger value="kanban">Kanban View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as "kanban" | "table")}
      >
        <TabsContent value="kanban" className="mt-0 min-w-0 overflow-hidden">
          <Card className="w-full min-w-0 border-0 bg-card text-card shadow-none">
            <CardHeader className="gap-3">
              <CardTitle className="text-card-foreground">Approval workflow</CardTitle>
              <ApprovalFilters reports={currentReports} />
            </CardHeader>

            <CardContent className="min-w-0 overflow-hidden">
              <ScrollArea className="w-full pb-3" scrollbars="horizontal">
                <Kanban
                  value={columns}
                  onValueChange={() => undefined}
                  getItemValue={(report) => String(report.id)}
                  onMove={handleMove}
                >
                  <KanbanBoard className="flex h-[calc(100vh-260px)] min-h-[420px] w-max min-w-full gap-4 p-4">
                    {visibleColumns.map((column) => (
                      <ApprovalKanbanColumn
                        key={column.id}
                        id={column.id}
                        title={column.title}
                        description={column.description}
                        reports={columns[column.id] ?? []}
                      >
                        {(columns[column.id] ?? []).map((report) => (
                          <KanbanItem key={report.id} value={String(report.id)}>
                            <KanbanItemHandle>
                              <ApprovalKanbanCard
                                report={report}
                                onClick={() => openDetailsSheet(report)}
                              />
                            </KanbanItemHandle>
                          </KanbanItem>
                        ))}
                      </ApprovalKanbanColumn>
                    ))}
                  </KanbanBoard>
                  <KanbanOverlay className="rounded-md border-2 border-dashed bg-muted/20" />
                </Kanban>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="mt-0">
          <ApprovalDataTable
            reports={currentReports}
            canSupervisorReview={canSupervisorReview}
            canDirectorReview={canDirectorReview}
            canPublishUpdate={canPublishUpdate}
            showHeader={false}
          />
        </TabsContent>
      </Tabs>

      <ApprovalDetailsSheet
        canSupervisorReview={canSupervisorReview}
        canDirectorReview={canDirectorReview}
        canPublishUpdate={canPublishUpdate}
      />
      <ApprovalVerificationDialog onApprovalUpdated={updateApprovalInStore} />
    </div>
  )
}
