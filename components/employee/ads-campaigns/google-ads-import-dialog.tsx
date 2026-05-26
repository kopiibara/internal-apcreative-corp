"use client"

import { useState } from "react"
import { FileUp } from "lucide-react"

import { GoogleAdsDetectedTemplateSummary } from "@/components/employee/ads-campaigns/google-ads-detected-template-summary"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  GOOGLE_ADS_MAX_CSV_BYTES,
  previewGoogleAdsCsv,
} from "@/lib/ads-campaigns/google-ads-csv-parser"

type GoogleAdsImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedBrandId: string
  lastSourceFileName: string | null
  isPending: boolean
  onImport: (file: File) => void
}

export function GoogleAdsImportDialog({
  open,
  onOpenChange,
  selectedBrandId,
  lastSourceFileName,
  isPending,
  onImport,
}: GoogleAdsImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ReturnType<
    typeof previewGoogleAdsCsv
  > | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)

  async function handleFileChange(file: File | null) {
    setSelectedFile(file)

    if (!file) {
      setPreview(null)
      setPreviewError(null)
      setIsPreviewing(false)
      return
    }

    setIsPreviewing(true)

    try {
      const csvText = await file.text()

      if (csvText.length > GOOGLE_ADS_MAX_CSV_BYTES) {
        throw new Error("CSV file is too large. Maximum size is 2 MB.")
      }

      setPreview(previewGoogleAdsCsv(csvText))
      setPreviewError(null)
    } catch (error: unknown) {
      setPreview(null)
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Unable to read this CSV file.",
      )
    } finally {
      setIsPreviewing(false)
    }
  }

  function resetImportState() {
    setSelectedFile(null)
    setPreview(null)
    setPreviewError(null)
    setIsPreviewing(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetImportState()
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-5" />
            Google Ads CSV Import
          </DialogTitle>
          <DialogDescription>
            Upload a Google Ads export. The importer detects supported column
            layouts automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>CSV file</Label>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) =>
                void handleFileChange(event.target.files?.[0] ?? null)
              }
            />
            <p className="text-xs text-muted-foreground">
              {selectedFile
                ? selectedFile.name
                : lastSourceFileName
                  ? `Last imported: ${lastSourceFileName}`
                  : "No Google Ads CSV imported yet."}
            </p>
          </div>

          {isPreviewing ? (
            <p className="text-sm text-muted-foreground">Reading CSV preview...</p>
          ) : null}

          <GoogleAdsDetectedTemplateSummary
            preview={preview}
            errorMessage={previewError}
          />

          {selectedBrandId === "all" ? (
            <p className="rounded-lg border-2 border-amber-500 bg-amber-100 p-3 text-sm font-semibold text-amber-950">
              Choose one brand before importing Google Ads data.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="neutral"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (selectedFile) {
                onImport(selectedFile)
                handleOpenChange(false)
              }
            }}
            disabled={
              isPending ||
              !selectedFile ||
              selectedBrandId === "all" ||
              Boolean(previewError) ||
              isPreviewing ||
              !preview
            }
          >
            {isPending ? "Importing..." : "Import CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
