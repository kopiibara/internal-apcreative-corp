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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { filterApprovalReports } from "@/lib/approvals/approval-filters"
import {
  EMPLOYEE_APPROVAL_KANBAN_COLUMNS,
  getEmployeeApprovalKanbanStage,
} from "@/lib/approvals/approval-kanban"
import { useContentReportStore } from "@/stores/use-content-report-store"
import type { ContentReport } from "@/types/content-report"
import { cn } from "@/lib/utils"

type EmployeeApprovalKanbanBoardProps = {
  reports: ContentReport[]
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
}: EmployeeApprovalKanbanBoardProps) {
  const router = useRouter()
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
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal">
            Approval Page
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit creative work and track supervisor, director, and publishing
            status.
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
          <Button className="shrink-0" onClick={openCreateDialog}>
            <Plus className="size-4" />
            Create Approval Report
          </Button>
        </div>
      </div>

      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as "kanban" | "table")}
      >
        <TabsContent value="kanban" className="mt-0 min-w-0 overflow-hidden">
          <BoardSection className="w-full min-w-0 overflow-hidden  pb-1 gap-2">
            <CardHeader className="min-w-0 shrink-0 gap-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-card-foreground">My submissions</CardTitle>
                {isPending ? (
                  <span className="text-xs text-muted-foreground">Updating...</span>
                ) : null}
              </div>
              <EmployeeApprovalFilters reports={reports} />
            </CardHeader>
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
          </BoardSection>
        </TabsContent>

        <TabsContent value="table" className="mt-0 min-w-0 overflow-hidden">
          <Card className="w-full min-w-0 overflow-hidden">
            <CardHeader className="gap-3">
              <CardTitle>My submissions</CardTitle>
              <EmployeeApprovalFilters reports={reports} />
            </CardHeader>
            <CardContent className="min-w-0">
              <EmployeeApprovalTableView reports={filteredReports} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isCreateDialogOpen ? (
        <ContentReportFormDialog
          mode="create"
          open={isCreateDialogOpen}
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
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeEditDialog()
            }
          }}
          report={selectedContentReport}
        />
      ) : null}

      <ContentReportDetailsSheet />

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
