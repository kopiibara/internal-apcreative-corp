"use client"

import { Button } from "@/components/ui/button"

type DataTablePaginationProps = {
  pageIndex: number
  pageCount: number
  canPreviousPage: boolean
  canNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}

export function DataTablePagination({
  pageIndex,
  pageCount,
  canPreviousPage,
  canNextPage,
  onPreviousPage,
  onNextPage,
}: DataTablePaginationProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-1">
      <p className="text-sm text-muted-foreground">
        Page {pageIndex + 1} of {pageCount || 1}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="neutral"
          size="sm"
          onClick={onPreviousPage}
          disabled={!canPreviousPage}
        >
          Previous
        </Button>
        <Button
          variant="neutral"
          size="sm"
          onClick={onNextPage}
          disabled={!canNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
