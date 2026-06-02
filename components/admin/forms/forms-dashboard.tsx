"use client"

import { useMemo, useState } from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Plus } from "lucide-react"

import { FormEntryDialog } from "@/components/admin/forms/form-entry-dialog"
import { DataTablePagination } from "@/components/shared/data-table-pagination"
import {
  DATA_TABLE_BODY_CLASS,
  DATA_TABLE_HEADER_CLASS,
  DataTableScrollArea,
} from "@/components/shared/data-table-scroll-area"
import { Button } from "@/components/ui/button"
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
  FORM_DEFINITIONS,
  FORM_FILTER_OPTIONS,
} from "@/lib/forms/form-definitions"
import {
  DEFAULT_FORM_TYPE,
  type FormSubmissionRecord,
  type FormType,
} from "@/lib/forms/form-types"
import { formatRecentOrDateTime } from "@/lib/date-time/relative-timestamp"
import { cn } from "@/lib/utils"

type FormsDashboardProps = {
  submissions: FormSubmissionRecord[]
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function getPayloadValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key]

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-"
  }

  if (typeof value === "string") {
    return value || "-"
  }

  if (value == null) {
    return "-"
  }

  return String(value)
}

export function FormsDashboard({ submissions }: FormsDashboardProps) {
  const [activeFormType, setActiveFormType] =
    useState<FormType>(DEFAULT_FORM_TYPE)
  const [dialogOpen, setDialogOpen] = useState(false)
  const definition = FORM_DEFINITIONS[activeFormType]

  const columns = useMemo<ColumnDef<FormSubmissionRecord>[]>(
    () => [
      ...definition.tableFields.map<ColumnDef<FormSubmissionRecord>>((fieldKey) => {
        const field = definition.fields.find((item) => item.key === fieldKey)

        return {
          id: fieldKey,
          header: field?.label ?? fieldKey,
          cell: ({ row }) => (
            <span className="line-clamp-2">
              {getPayloadValue(row.original.payload, fieldKey)}
            </span>
          ),
        }
      }),
      {
        id: "createdByName",
        header: "Created by",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.createdByName}</span>
        ),
      },
      {
        id: "createdAt",
        header: "Saved",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatRecentOrDateTime(row.original.createdAt, dateFormatter)}
          </span>
        ),
      },
    ],
    [definition],
  )

  const filteredSubmissions = useMemo(
    () =>
      submissions.filter(
        (submission) => submission.formType === activeFormType,
      ),
    [activeFormType, submissions],
  )

  const table = useReactTable({
    data: filteredSubmissions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <>
      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4  rounded-lg border-2 border-border  px-4 py-4 shadow-hard-sm bg-white dark:bg-gray-900">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-row gap-3  justify-between">
            <div className="min-w-0 lg:hidden">
              <Select
                value={activeFormType}
                onValueChange={(value) => setActiveFormType(value as FormType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select form" />
                </SelectTrigger>
                <SelectContent>
                  {FORM_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden min-w-0 flex-wrap gap-2 lg:flex">
              {FORM_FILTER_OPTIONS.map((option) => {
                const isActive = option.value === activeFormType

                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={isActive ? "default" : "neutral"}
                    className={cn(
                      "h-auto min-h-9 whitespace-normal px-3 py-2 text-left text-xs",
                      isActive && "shadow-none",
                    )}
                    onClick={() => setActiveFormType(option.value)}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>

            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="size-4" />
              Add Form
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <DataTableScrollArea fill scrollbars="both">
            <Table className="min-w-[980px]">
              <TableHeader className={DATA_TABLE_HEADER_CLASS}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
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
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="max-w-[260px] align-top"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-40 text-center text-sm text-muted-foreground"
                    >
                      No form entries yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DataTableScrollArea>
        </div>
        <DataTablePagination
          pageIndex={table.getState().pagination.pageIndex}
          pageCount={table.getPageCount()}
          canPreviousPage={table.getCanPreviousPage()}
          canNextPage={table.getCanNextPage()}
          onPreviousPage={() => table.previousPage()}
          onNextPage={() => table.nextPage()}
        />
      </section>

      <FormEntryDialog
        formType={activeFormType}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
