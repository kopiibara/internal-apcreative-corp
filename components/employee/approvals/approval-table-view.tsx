"use client"

import { useState } from "react"
import { Eye, MoreHorizontal, Pencil, XCircle } from "lucide-react"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  canEmployeeEditOwnReport,
  type ContentReport,
} from "@/types/content-report"
import { useContentReportStore } from "@/stores/use-content-report-store"

type EmployeeApprovalTableViewProps = {
  reports: ContentReport[]
  currentProfileId: number
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

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
  currentProfileId,
  openEditDialog,
  openDeleteDialog,
  openDetailsSheet,
}: {
  currentProfileId: number
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
      accessorKey: "brandName",
      header: "Brand",
      cell: ({ row }) => row.original.brandName ?? "No brand",
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
      cell: ({ row }) => (
        <StatusBadge status={row.original.supervisorStatus} type="approval" />
      ),
    },
    {
      accessorKey: "directorStatus",
      header: ({ column }) => (
        <SortButton label="Director of Marketing Status" column={column} />
      ),
      cell: ({ row }) => (
        <StatusBadge status={row.original.directorStatus} type="approval" />
      ),
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
      cell: ({ row }) => (
        <StatusBadge status={row.original.publishStatus} type="publish" />
      ),
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
        const canEdit = canEmployeeEditOwnReport(report, currentProfileId)

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

export function EmployeeApprovalTableView({
  reports,
  currentProfileId,
}: EmployeeApprovalTableViewProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const { openEditDialog, openDeleteDialog, openDetailsSheet } =
    useContentReportStore()

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: reports,
    columns: getContentReportColumns({
      currentProfileId,
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

  return (
    <div className="min-w-0 space-y-4">
      <div className="w-full min-w-0 rounded-lg border">
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
            variant="neutral"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="neutral"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
