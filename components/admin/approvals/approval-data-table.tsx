"use client"

import { useMemo, useState } from "react"
import {
  CalendarClock,
  Clipboard,
  Eye,
  FilePenLine,
  MoreHorizontal,
  ShieldCheck,
} from "lucide-react"
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

import { ApprovalFilters } from "@/components/admin/approvals/approval-filters"
import { DirectorReviewForm } from "@/components/admin/approvals/director-review-form"
import { PublishingReviewForm } from "@/components/admin/approvals/publishing-review-form"
import { SupervisorReviewForm } from "@/components/admin/approvals/supervisor-review-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  canEditPublishingFields,
  type ContentReport,
} from "@/types/content-report"
import { filterApprovalReports } from "@/lib/approval-filters"
import { getStatusBadgeVariant } from "@/lib/approval-statuses"
import { useApprovalStore } from "@/stores/use-approval-store"

type ApprovalDataTableProps = {
  reports: ContentReport[]
  canSupervisorReview: boolean
  canDirectorReview: boolean
  canPublishUpdate: boolean
  showHeader?: boolean
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={getStatusBadgeVariant(status)}>
      {status}
    </Badge>
  )
}

function getDateLabel(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not scheduled"
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

function SupervisorReviewDialog({
  report,
  open,
  onOpenChange,
}: {
  report: ContentReport
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Marketing Supervisor Review</DialogTitle>
          <DialogDescription>
            Update supervisor status and notes for this submission.
          </DialogDescription>
        </DialogHeader>
        <SupervisorReviewForm
          report={report}
          canEdit={true}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function DirectorReviewDialog({
  report,
  open,
  onOpenChange,
}: {
  report: ContentReport
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Director of Marketing Review</DialogTitle>
          <DialogDescription>
            Update director status and notes for this submission.
          </DialogDescription>
        </DialogHeader>
        <DirectorReviewForm
          report={report}
          canEdit={true}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function PublishingDialog({
  report,
  open,
  onOpenChange,
}: {
  report: ContentReport
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Publishing Details</DialogTitle>
          <DialogDescription>
            Publishing fields unlock after supervisor and director approvals.
          </DialogDescription>
        </DialogHeader>
        <PublishingReviewForm
          report={report}
          canPublishUpdate={true}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function getApprovalColumns({
  canSupervisorReview,
  canDirectorReview,
  canPublishUpdate,
  openDetailsSheet,
  openSupervisorReviewDialog,
  openDirectorReviewDialog,
  openPublishingDialog,
  copyAssetLink,
}: {
  canSupervisorReview: boolean
  canDirectorReview: boolean
  canPublishUpdate: boolean
  openDetailsSheet: (report: ContentReport) => void
  openSupervisorReviewDialog: (report: ContentReport) => void
  openDirectorReviewDialog: (report: ContentReport) => void
  openPublishingDialog: (report: ContentReport) => void
  copyAssetLink: (assetLink: string) => void
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
      header: "Caption Preview",
      cell: ({ row }) => (
        <div className="max-w-[280px]">
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
      accessorKey: "submittedByName",
      header: ({ column }) => (
        <SortButton label="Submitted By" column={column} />
      ),
      cell: ({ row }) => (
        <div className="min-w-[160px]">
          <div className="font-medium">{row.original.submittedByName}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.submittedByEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "brandName",
      header: "Brand",
      cell: ({ row }) => row.original.brandName ?? "No brand",
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
        const canPublishReport =
          canPublishUpdate && canEditPublishingFields(report)

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open approval actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openDetailsSheet(report)}>
                  <Eye className="size-4" />
                  View details
                </DropdownMenuItem>
                {canSupervisorReview || canDirectorReview || canPublishReport ? (
                  <DropdownMenuSeparator />
                ) : null}
                {canSupervisorReview ? (
                  <DropdownMenuItem
                    onClick={() => openSupervisorReviewDialog(report)}
                  >
                    <ShieldCheck className="size-4" />
                    Supervisor review
                  </DropdownMenuItem>
                ) : null}
                {canDirectorReview ? (
                  <DropdownMenuItem onClick={() => openDirectorReviewDialog(report)}>
                    <FilePenLine className="size-4" />
                    Director review
                  </DropdownMenuItem>
                ) : null}
                {canPublishReport ? (
                  <DropdownMenuItem onClick={() => openPublishingDialog(report)}>
                    <CalendarClock className="size-4" />
                    Update publishing
                  </DropdownMenuItem>
                ) : null}
                {report.assetLink ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => copyAssetLink(report.assetLink || "")}
                    >
                      <Clipboard className="size-4" />
                      Copy asset link
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

export function ApprovalDataTable({
  reports,
  canSupervisorReview,
  canDirectorReview,
  canPublishUpdate,
  showHeader = true,
}: ApprovalDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const {
    selectedApproval,
    searchQuery,
    selectedBrandFilter,
    selectedContentTypeFilter,
    selectedPlatformFilter,
    selectedSupervisorStatusFilter,
    selectedDirectorStatusFilter,
    selectedPublishStatusFilter,
    isSupervisorReviewDialogOpen,
    isDirectorReviewDialogOpen,
    isPublishingDialogOpen,
    openDetailsSheet,
    openSupervisorReviewDialog,
    closeSupervisorReviewDialog,
    openDirectorReviewDialog,
    closeDirectorReviewDialog,
    openPublishingDialog,
    closePublishingDialog,
  } = useApprovalStore()

  const filteredReports = useMemo(() => {
    return filterApprovalReports(reports, {
      searchQuery,
      selectedBrandFilter,
      selectedContentTypeFilter,
      selectedPlatformFilter,
      selectedSupervisorStatusFilter,
      selectedDirectorStatusFilter,
      selectedPublishStatusFilter,
    })
  }, [
    reports,
    searchQuery,
    selectedBrandFilter,
    selectedContentTypeFilter,
    selectedDirectorStatusFilter,
    selectedPlatformFilter,
    selectedPublishStatusFilter,
    selectedSupervisorStatusFilter,
  ])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredReports,
    columns: getApprovalColumns({
      canSupervisorReview,
      canDirectorReview,
      canPublishUpdate,
      openDetailsSheet,
      openSupervisorReviewDialog,
      openDirectorReviewDialog,
      openPublishingDialog,
      copyAssetLink,
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

  function copyAssetLink(assetLink: string) {
    navigator.clipboard
      .writeText(assetLink)
      .then(() => toast.success("Asset link copied."))
      .catch(() => toast.error("Could not copy the asset link."))
  }

  return (
    <div className="min-w-0 space-y-6">
      {showHeader ? (
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review content submissions and update publishing once both approvals
            are complete.
          </p>
        </div>
      ) : null}

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="gap-3">
          <CardTitle>Content approval </CardTitle>
          <ApprovalFilters reports={reports} />
        </CardHeader>

        <CardContent className="min-w-0 space-y-4">
          <div className="w-full min-w-0 rounded-md border">
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
                      No approvals found.
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

      {isSupervisorReviewDialogOpen && selectedApproval ? (
        <SupervisorReviewDialog
          key={`supervisor-${selectedApproval.id}`}
          report={selectedApproval}
          open={isSupervisorReviewDialogOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeSupervisorReviewDialog()
            }
          }}
        />
      ) : null}

      {isDirectorReviewDialogOpen && selectedApproval ? (
        <DirectorReviewDialog
          key={`director-${selectedApproval.id}`}
          report={selectedApproval}
          open={isDirectorReviewDialogOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeDirectorReviewDialog()
            }
          }}
        />
      ) : null}

      {isPublishingDialogOpen && selectedApproval ? (
        <PublishingDialog
          key={`publishing-${selectedApproval.id}`}
          report={selectedApproval}
          open={isPublishingDialogOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closePublishingDialog()
            }
          }}
        />
      ) : null}
    </div>
  )
}
