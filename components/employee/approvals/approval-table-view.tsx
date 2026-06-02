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
import { DataTablePagination } from "@/components/shared/data-table-pagination"
import {
  DATA_TABLE_BODY_CLASS,
  DATA_TABLE_HEADER_CLASS,
  DataTableScrollArea,
} from "@/components/shared/data-table-scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { formatRecentOrDateTime } from "@/lib/date-time/relative-timestamp"
import { useContentReportStore } from "@/stores/use-content-report-store"

type EmployeeApprovalTableViewProps = {
  reports: ContentReport[]
  currentProfileId: number
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function getDateLabel(value: string | null) {
  return value ? formatRecentOrDateTime(value, dateFormatter) : "Not scheduled"
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
          {formatRecentOrDateTime(row.original.dateSubmitted, dateFormatter)}
        </span>
      ),
    },
    {
      accessorKey: "brandName",
      header: "Brand",
      cell: ({ row }) =>
        row.original.brandName ? (
          <Badge variant="secondary">{row.original.brandName}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No brand</span>
        ),
    },
    {
      accessorKey: "contentType",
      header: ({ column }) => (
        <SortButton label="Content Type" column={column} />
      ),
      cell: ({ row }) => (
        <Badge variant="neutral">{row.original.contentType}</Badge>
      ),
    },
    {
      accessorKey: "platform",
      header: ({ column }) => <SortButton label="Platform" column={column} />,
      cell: ({ row }) => (
        <Badge variant="neutral">{row.original.platform}</Badge>
      ),
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <DataTableScrollArea
        fill
        scrollbars="horizontal"
        viewportClassName="h-auto max-h-none rounded-lg [&>div]:min-h-0"
      >
        <Table className="min-w-[1600px] border-0">
          <TableHeader className={DATA_TABLE_HEADER_CLASS}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={DATA_TABLE_BODY_CLASS}>
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
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => openDetailsSheet(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="align-top"
                      onClick={
                        cell.column.id === "actions"
                          ? (event) => event.stopPropagation()
                          : undefined
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableScrollArea>

      <DataTablePagination
        pageIndex={table.getState().pagination.pageIndex}
        pageCount={table.getPageCount()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
      />
    </div>
  )
}
