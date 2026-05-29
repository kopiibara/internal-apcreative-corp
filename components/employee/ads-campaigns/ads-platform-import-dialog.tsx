"use client"

import { useState } from "react"
import { FileUp } from "lucide-react"

import { CsvImportThinkingSteps } from "@/components/employee/ads-campaigns/csv-import-thinking-steps"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AdsPlatform } from "@/lib/ads-campaigns-types"
import {
  GOOGLE_ADS_MAX_CSV_BYTES,
  previewGoogleAdsCsv,
} from "@/lib/ads-campaigns/google-ads-csv-parser"
import { previewMetaAdsCampaignCsv } from "@/lib/ads-campaigns/meta-ads-csv-parser"

type AdsPlatformImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  platform: AdsPlatform
  selectedBrandId: string
  lastSourceFileName: string | null
  onImport: (file: File) => Promise<void>
}

const platformLabels: Record<AdsPlatform, string> = {
  GOOGLE: "Google",
  META: "Meta",
  TIKTOK: "TikTok",
}

function previewPlatformCsv(platform: AdsPlatform, csvText: string) {
  if (platform === "GOOGLE") {
    return previewGoogleAdsCsv(csvText)
  }

  if (platform === "META") {
    return previewMetaAdsCampaignCsv(csvText)
  }

  throw new Error(`${platformLabels[platform]} CSV import is not supported yet.`)
}

export function AdsPlatformImportDialog({
  open,
  onOpenChange,
  platform,
  selectedBrandId,
  lastSourceFileName,
  onImport,
}: AdsPlatformImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ReturnType<
    typeof previewPlatformCsv
  > | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importComplete, setImportComplete] = useState(false)

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

      setPreview(previewPlatformCsv(platform, csvText))
      setPreviewError(null)
    } catch (error) {
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
    setIsImporting(false)
    setImportComplete(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isImporting) {
      return
    }

    if (!nextOpen) {
      resetImportState()
    }

    onOpenChange(nextOpen)
  }

  async function handleImport() {
    if (!selectedFile) {
      return
    }

    setIsImporting(true)
    setImportComplete(false)

    try {
      await onImport(selectedFile)
      setImportComplete(true)

      window.setTimeout(() => {
        handleOpenChange(false)
      }, 900)
    } catch {
      setIsImporting(false)
      setImportComplete(false)
    }
  }

  const showThinkingSteps = isImporting || importComplete

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-5" />
            {platformLabels[platform]} Ads CSV Import
          </DialogTitle>
          <DialogDescription>
            Upload a {platformLabels[platform]} Ads export. The importer will
            validate the template based on the selected platform.
          </DialogDescription>
        </DialogHeader>

        {showThinkingSteps ? (
          <DialogBody>
            <CsvImportThinkingSteps
              platform={platform}
              isComplete={importComplete}
              fileName={selectedFile?.name}
            />
          </DialogBody>
        ) : (
          <DialogBody className="space-y-3">
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
                    : `No ${platformLabels[platform]} CSV imported yet.`}
              </p>
            </div>

            {isPreviewing ? (
              <p className="text-sm text-muted-foreground">
                Reading CSV preview...
              </p>
            ) : null}

            {previewError ? (
              <p className="rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                {previewError}
              </p>
            ) : null}

            {preview ? (
              <div className="space-y-2 rounded-lg border-2 border-border bg-muted/20 p-3 text-sm">
                <p>
                  <span className="font-semibold">Detected template:</span>{" "}
                  {preview.templateLabel}
                </p>
                <p>
                  <span className="font-semibold">Detected columns:</span>{" "}
                  {preview.detectedColumns.join(", ")}
                </p>
                <p>
                  <span className="font-semibold">Row count:</span>{" "}
                  {preview.rowCount}
                </p>
                {preview.dateRange ? (
                  <p>
                    <span className="font-semibold">Date range:</span>{" "}
                    {preview.dateRange.start} to {preview.dateRange.end}
                  </p>
                ) : null}
              </div>
            ) : null}

            {selectedBrandId === "all" ? (
              <p className="rounded-lg border-2 border-amber-500 bg-amber-100 p-3 text-sm font-semibold text-amber-950">
                Choose one brand before importing {platformLabels[platform]}{" "}
                data.
              </p>
            ) : null}
          </DialogBody>
        )}

        {!showThinkingSteps ? (
          <DialogFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={() => void handleImport()}
              disabled={
                !selectedFile ||
                selectedBrandId === "all" ||
                Boolean(previewError) ||
                isPreviewing ||
                !preview
              }
            >
              Import {platformLabels[platform]} CSV
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
