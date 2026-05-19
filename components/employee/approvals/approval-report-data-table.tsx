"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, MoreHorizontal, Pencil, Plus, Search, XCircle } from "lucide-react"
import { toast } from "sonner"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { cancelContentReport } from "@/app/employee/approvals/actions"
import {
  contentTypes,
  publishStatuses,
  reviewStatuses,
} from "@/app/employee/approvals/schema"
import { ContentReportFormDialog } from "@/components/employee/approvals/approval-report-form-dialog"
import { ContentReportDetailsSheet } from "@/components/employee/approvals/approval-report-details-sheet"
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
import { Badge } from "@/components/ui/badge"
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

type ContentReportDataTableProps = {
  reports: ContentReport[]
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "Approved" ? "default" : "outline"}>
      {status}
    </Badge>
  )
}

function getDateLabel(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not scheduled"
}

function hasText(value: string | null) {
  return Boolean(value?.trim())
}

function SortButton({
  label,
  column,
}: {
  label: string
  column: {
    toggleSorting: (desc?: boolean) => void
    getIsSorted: () => false | "asc" | "desc"
  }
}) {
  const direction = column.getIsSorted()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(direction === "asc")}
    >
      {label}
      {direction ? (direction === "asc" ? " ↑" : " ↓") : null}
    </Button>
  )
}

function getContentReportColumns({
  openEditDialog,
  openDeleteDialog,
  openDetailsSheet,
}: {
  openEditDialog: (report: ContentReport) => void
  openDeleteDialog: (report: ContentReport) => void
  openDetailsSheet: (report: ContentReport) => void
}): ColumnDef<ContentReport>[] {
  return [
    {
      accessorKey: "dateSubmitted",
      header: ({ column }) => (
        <SortButton label="Date Submitted" column={column} />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {dateFormatter.format(new Date(row.original.dateSubmitted))}
        </span>
      ),
    },
    {
      accessorKey: "contentType",
      header: ({ column }) => (
        <SortButton label="Content Type" column={column} />
      ),
    },
    {
      accessorKey: "platform",
      header: ({ column }) => <SortButton label="Platform" column={column} />,
    },
    {
      accessorKey: "caption",
      header: "Caption",
      cell: ({ row }) => (
        <div className="max-w-sm">
          <div className="line-clamp-2">{row.original.caption}</div>
        </div>
      ),
    },
    {
      accessorKey: "assetLink",
      header: "Asset Link",
      cell: ({ row }) =>
        row.original.assetLink ? (
          <a
            href={row.original.assetLink}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline-offset-4 hover:underline"
          >
            Open asset
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">No link</span>
        ),
    },
    {
      accessorKey: "supervisorStatus",
      header: ({ column }) => (
        <SortButton label="Marketing Supervisor Status" column={column} />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.supervisorStatus} />,
    },
    {
      accessorKey: "directorStatus",
      header: ({ column }) => (
        <SortButton label="Director of Marketing Status" column={column} />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.directorStatus} />,
    },
    {
      id: "reviewNotes",
      header: "Review Notes",
      cell: ({ row }) => {
        const report = row.original
        const hasSupervisorNote = hasText(report.supervisorNotes)
        const hasDirectorNote = hasText(report.directorNotes)

        if (!hasSupervisorNote && !hasDirectorNote) {
          return <span className="text-xs text-muted-foreground">None</span>
        }

        return (
          <div className="flex min-w-[180px] flex-wrap gap-1">
            {hasSupervisorNote ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => openDetailsSheet(report)}
              >
                <Badge variant="secondary">Supervisor Note</Badge>
              </Button>
            ) : null}
            {hasDirectorNote ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => openDetailsSheet(report)}
              >
                <Badge variant="secondary">Director Note</Badge>
              </Button>
            ) : null}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "publishStatus",
      header: ({ column }) => (
        <SortButton label="Publish Status" column={column} />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.publishStatus} />,
    },
    {
      accessorKey: "scheduledPublishedDate",
      header: ({ column }) => (
        <SortButton label="Scheduled / Published Date" column={column} />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {getDateLabel(row.original.scheduledPublishedDate)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const report = row.original
        const canEdit = canEmployeeEditReport(report)

        return (
          <div className="text-right">
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
                <DropdownMenuItem onClick={() => openDetailsSheet(report)}>
                  <Eye className="size-4" />
                  View Details
                </DropdownMenuItem>
                {canEdit ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openEditDialog(report)}>
                      <Pencil className="size-4" />
                      Edit report
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => openDeleteDialog(report)}
                    >
                      <XCircle className="size-4" />
                      Cancel report
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
      enableSorting: false,
    },
  ]
}

export function ContentReportDataTable({ reports }: ContentReportDataTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
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
    openDetailsSheet,
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
        report.platform.toLowerCase().includes(normalizedQuery) ||
        (report.contentInspo ?? "").toLowerCase().includes(normalizedQuery) ||
        (report.employeeComments ?? "").toLowerCase().includes(normalizedQuery)

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

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredReports,
    columns: getContentReportColumns({
      openEditDialog,
      openDeleteDialog,
      openDetailsSheet,
    }),
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

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
    <div className="min-w-0 space-y-6">
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
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Create Approval Report
        </Button>
      </div>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>My submissions</CardTitle>
            {isPending ? (
              <span className="text-xs text-muted-foreground">Updating...</span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <div className="relative min-w-[260px] md:min-w-[320px]">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search reports"
                className="h-9 pl-9"
              />
            </div>

            <Select
              value={selectedContentTypeFilter}
              onValueChange={setSelectedContentTypeFilter}
            >
              <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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
              <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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
              <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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
              <SelectTrigger className="h-9 min-w-[150px] md:min-w-[160px]">
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

            <Button
              variant="outline"
              size="sm"
              className="h-9 whitespace-nowrap"
              onClick={resetContentReportFilters}
            >
              Reset Filters
            </Button>
          </div>
        </CardHeader>

        <CardContent className="min-w-0 space-y-4">
          <div className="w-full min-w-0 overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllColumns().length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No content reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="align-top">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
              disabled={isPending}
              onClick={handleCancelReport}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              {isPending ? "Cancelling..." : "Cancel Report"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
