"use client"

import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { cancelContentReport } from "@/app/employee/approvals/actions"
import { ContentReportFormDialog } from "@/components/employee/approvals/approval-report-form-dialog"
import { ContentReportDetailsSheet } from "@/components/employee/approvals/approval-report-details-sheet"
import { EmployeeApprovalFilters } from "@/components/employee/approvals/approval-filters"
import { EmployeeApprovalKanbanCard } from "@/components/employee/approvals/approval-kanban-card"
import { EmployeeApprovalKanbanColumn } from "@/components/employee/approvals/approval-kanban-column"
import { EmployeeApprovalTableView } from "@/components/employee/approvals/approval-table-view"
import { BoardSection } from "@/components/shared/board-section"
import {
  KanbanBoardShell,
  KanbanColumnsRow,
  KANBAN_BOARD_SCROLL_ROW_CLASS,
} from "@/components/shared/kanban-board-scroll"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { filterApprovalReports } from "@/lib/approvals/approval-filters"
import {
  EMPLOYEE_APPROVAL_KANBAN_COLUMNS,
  getBrandOfficerReadyToPublishCount,
  getEmployeeApprovalKanbanStage,
} from "@/lib/approvals/approval-kanban"
import { useApprovalPollingRefresh } from "@/hooks/use-approval-polling-refresh"
import { useContentReportStore } from "@/stores/use-content-report-store"
import type { ContentReportBrandOption } from "@/lib/content-report-brand-options"
import type { ContentReport } from "@/types/content-report"
import { cn } from "@/lib/utils"

type EmployeeApprovalKanbanBoardProps = {
  reports: ContentReport[]
  brandOptions: ContentReportBrandOption[]
  canCreateContentReport?: boolean
  currentProfileId: number
}

function buildEmployeeColumns(reports: ContentReport[]) {
  return EMPLOYEE_APPROVAL_KANBAN_COLUMNS.reduce<Record<string, ContentReport[]>>(
    (columns, column) => {
      columns[column.id] = reports.filter(
        (report) => getEmployeeApprovalKanbanStage(report) === column.id
      )
      return columns
    },
    {}
  )
}

export function EmployeeApprovalKanbanBoard({
  reports,
  brandOptions,
  canCreateContentReport = false,
  currentProfileId,
}: EmployeeApprovalKanbanBoardProps) {
  const router = useRouter()
  useApprovalPollingRefresh()
  const [isPending, startTransition] = useTransition()
  const {
    selectedContentReport,
    isCreateDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    activeView,
    searchQuery,
    selectedBrandFilter,
    selectedContentTypeFilter,
    selectedPlatformFilter,
    selectedSupervisorStatusFilter,
    selectedDirectorStatusFilter,
    selectedPublishStatusFilter,
    openCreateDialog,
    closeCreateDialog,
    closeEditDialog,
    closeDeleteDialog,
    openDetailsSheet,
    setActiveView,
  } = useContentReportStore()

  const filteredReports = useMemo(
    () =>
      filterApprovalReports(reports, {
        searchQuery,
        selectedBrandFilter,
        selectedContentTypeFilter,
        selectedPlatformFilter,
        selectedSupervisorStatusFilter,
        selectedDirectorStatusFilter,
        selectedPublishStatusFilter,
      }),
    [
      reports,
      searchQuery,
      selectedBrandFilter,
      selectedContentTypeFilter,
      selectedDirectorStatusFilter,
      selectedPlatformFilter,
      selectedPublishStatusFilter,
      selectedSupervisorStatusFilter,
    ]
  )

  const columns = useMemo(
    () => buildEmployeeColumns(filteredReports),
    [filteredReports]
  )
  const readyToPublishCount = useMemo(
    () => getBrandOfficerReadyToPublishCount(filteredReports),
    [filteredReports]
  )
  const hasNoReports = reports.length === 0

  function handleCancelReport() {
    if (!selectedContentReport) {
      return
    }

    startTransition(async () => {
      const result = await cancelContentReport({
        reportId: selectedContentReport.id,
      })

      if (result.success) {
        toast.success(result.message)
        closeDeleteDialog()
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  const employeeBoardRowClass = cn(
    KANBAN_BOARD_SCROLL_ROW_CLASS,
    "px-3 pb-1 sm:px-6"
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
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
                  No approval reports yet. Create your first submission to start
                  the review workflow.
                </p>
              ) : null}

              <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-start gap-3 lg:justify-end">
                <TabsList>
                  <TabsTrigger value="kanban">
                    Kanban Board
                    {readyToPublishCount > 0 ? (
                      <span className="ml-2 rounded-md border border-border bg-background px-1.5 text-xs">
                        {readyToPublishCount}
                      </span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="table">Table View</TabsTrigger>
                </TabsList>
                {canCreateContentReport ? (
                  <Button className="shrink-0" onClick={openCreateDialog}>
                    <Plus className="size-4" />
                    Create Approval Report
                  </Button>
                ) : null}
              </div>
            </div>

            {isPending ? (
              <span className="text-xs text-muted-foreground">Updating...</span>
            ) : null}
            <EmployeeApprovalFilters reports={reports} />
          </CardHeader>

          <TabsContent value="kanban" className="mt-0 min-w-0 overflow-hidden">
            <CardContent className="min-w-0 overflow-hidden px-0 pb-0">
              <KanbanBoardShell>
                <KanbanColumnsRow className={employeeBoardRowClass}>
                  {EMPLOYEE_APPROVAL_KANBAN_COLUMNS.map((column) => (
                    <EmployeeApprovalKanbanColumn
                      key={column.id}
                      id={column.id}
                      title={column.title}
                      count={columns[column.id]?.length ?? 0}
                    >
                      {(columns[column.id] ?? []).map((report) => (
                        <EmployeeApprovalKanbanCard
                          key={report.id}
                          report={report}
                          onOpenDetails={openDetailsSheet}
                        />
                      ))}
                    </EmployeeApprovalKanbanColumn>
                  ))}
                </KanbanColumnsRow>
              </KanbanBoardShell>
            </CardContent>
          </TabsContent>

          <TabsContent value="table" className="mt-0 min-w-0 overflow-hidden">
            <CardContent className="min-w-0">
              <EmployeeApprovalTableView
                reports={filteredReports}
                currentProfileId={currentProfileId}
              />
            </CardContent>
          </TabsContent>
        </BoardSection>
      </Tabs>

      {isCreateDialogOpen ? (
        <ContentReportFormDialog
          mode="create"
          open={isCreateDialogOpen}
          brandOptions={brandOptions}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeCreateDialog()
            }
          }}
        />
      ) : null}

      {isEditDialogOpen && selectedContentReport ? (
        <ContentReportFormDialog
          key={selectedContentReport.id}
          mode="edit"
          open={isEditDialogOpen}
          brandOptions={brandOptions}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeEditDialog()
            }
          }}
          report={selectedContentReport}
        />
      ) : null}

      <ContentReportDetailsSheet currentProfileId={currentProfileId} />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeDeleteDialog()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel content report?</AlertDialogTitle>
            <AlertDialogDescription>
              This keeps the submission history but marks the publishing status
              as Cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep Report</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleCancelReport}
            >
              {isPending ? "Cancelling..." : "Cancel Report"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
