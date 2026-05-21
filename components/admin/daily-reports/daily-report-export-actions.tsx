"use client"

import { FileDown, FileSpreadsheet, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function DailyReportExportActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => toast.message("Export will be available soon.")}
      >
        <FileSpreadsheet className="size-4" />
        Export Excel
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => toast.message("Export will be available soon.")}
      >
        <FileDown className="size-4" />
        Export PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          toast.message("Summary generation will be available soon.")
        }
      >
        <Sparkles className="size-4" />
        Generate Summary
      </Button>
    </div>
  )
}
