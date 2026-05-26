"use client"

import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Plus, Search, XCircle } from "lucide-react"
import { toast } from "sonner"

import { cancelContentReport } from "@/app/employee/approvals/actions"
import {
  contentTypes,
  publishStatuses,
  reviewStatuses,
} from "@/app/employee/approvals/schema"
import { ContentReportFormDialog } from "@/components/employee/approvals/approval-report-form-dialog"
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
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  canEmployeeEditReport,
  type ContentReport,
} from "@/types/content-report"
import { useContentReportStore } from "@/stores/use-content-report-store"

type ContentReportTableProps = {
  reports: ContentReport[]
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function getDateLabel(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not scheduled"
}

export function ContentReportTable({ reports }: ContentReportTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const {
    selectedContentReport,
    isCreateDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    searchQuery,
    selectedContentTypeFilter,
    selectedSupervisorStatusFilter,
    selectedDirectorStatusFilter,
    selectedPublishStatusFilter,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    setSearchQuery,
    setSelectedContentTypeFilter,
    setSelectedSupervisorStatusFilter,
    setSelectedDirectorStatusFilter,
    setSelectedPublishStatusFilter,
    resetContentReportFilters,
  } = useContentReportStore()

  const filteredReports = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return reports.filter((report) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        report.caption.toLowerCase().includes(normalizedQuery) ||
        report.contentType.toLowerCase().includes(normalizedQuery) ||
        (report.contentInspo ?? "").toLowerCase().includes(normalizedQuery)

      return (
        matchesSearch &&
        (selectedContentTypeFilter === "all" ||
          report.contentType === selectedContentTypeFilter) &&
        (selectedSupervisorStatusFilter === "all" ||
          report.supervisorStatus === selectedSupervisorStatusFilter) &&
        (selectedDirectorStatusFilter === "all" ||
          report.directorStatus === selectedDirectorStatusFilter) &&
        (selectedPublishStatusFilter === "all" ||
          report.publishStatus === selectedPublishStatusFilter)
      )
    })
  }, [
    reports,
    searchQuery,
    selectedContentTypeFilter,
    selectedDirectorStatusFilter,
    selectedPublishStatusFilter,
    selectedSupervisorStatusFilter,
  ])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            Approval Page
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit creative work and track supervisor, director, and publishing
            status.
          </p>
        </div>
        <Button onClick={openCreateDialog} >
          <Plus className="size-4" />
          Create Approval Report
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Button variant="neutral" size="sm" onClick={resetContentReportFilters}>
              Reset Filters
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search reports"
                className="pl-9"
              />
            </div>

            <Select
              value={selectedContentTypeFilter}
              onValueChange={setSelectedContentTypeFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All content types</SelectItem>
                {contentTypes.map((contentType) => (
                  <SelectItem key={contentType} value={contentType}>
                    {contentType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSupervisorStatusFilter}
              onValueChange={setSelectedSupervisorStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Supervisor status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All supervisor statuses</SelectItem>
                {reviewStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedDirectorStatusFilter}
              onValueChange={setSelectedDirectorStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Director status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All director statuses</SelectItem>
                {reviewStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedPublishStatusFilter}
              onValueChange={setSelectedPublishStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Publish status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All publish statuses</SelectItem>
                {publishStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Content Type</TableHead>
                <TableHead>Caption</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Director</TableHead>
                <TableHead>Publish</TableHead>
                <TableHead>Scheduled / Published</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No content reports found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => {
                  const canEdit = canEmployeeEditReport(report)

                  return (
                    <TableRow key={report.id}>
                      <TableCell className="whitespace-nowrap">
                        {dateFormatter.format(new Date(report.dateSubmitted))}
                      </TableCell>
                      <TableCell>{report.contentType}</TableCell>
                      <TableCell className="max-w-sm">
                        <div className="line-clamp-2">{report.caption}</div>
                        {report.assetLink ? (
                          <a
                            href={report.assetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                          >
                            Asset link
                          </a>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <StatusBadge status={report.supervisorStatus} type="approval" />
                          {report.supervisorNotes ? (
                            <p className="max-w-xs text-xs text-muted-foreground">
                              {report.supervisorNotes}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <StatusBadge status={report.directorStatus} type="approval" />
                          {report.directorNotes ? (
                            <p className="max-w-xs text-xs text-muted-foreground">
                              {report.directorNotes}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={report.publishStatus} type="publish" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {getDateLabel(report.scheduledPublishedDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Open content report actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(report)}
                              disabled={!canEdit}
                            >
                              <Pencil className="size-4" />
                              Edit report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => openDeleteDialog(report)}
                              disabled={!canEdit}
                            >
                              <XCircle className="size-4" />
                              Cancel report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isCreateDialogOpen ? (
        <ContentReportFormDialog
          mode="create"
          open={isCreateDialogOpen}
          brandOptions={[]}
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
          brandOptions={[]}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeEditDialog()
            }
          }}
          report={selectedContentReport}
        />
      ) : null}

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
