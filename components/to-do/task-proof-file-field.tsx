"use client"

import { useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { readFileAsDataUrl } from "@/lib/files/read-as-data-url"
import {
  PROOF_IMAGE_ACCEPT,
  validateProofFile,
} from "@/lib/proof/proof-media"

type TaskProofFileFieldProps = {
  value: string
  disabled?: boolean
  id?: string
  label?: ReactNode
  showHelpText?: boolean
  showSelectedState?: boolean
  keepSelectedFileName?: boolean
  fileNameOnlyDisplay?: boolean
  onChange: (dataUrl: string) => void
  onClear: () => void
}

export function TaskProofFileField({
  value,
  disabled = false,
  id = "task-proof-image-file",
  label = "Image proof",
  showHelpText = true,
  showSelectedState = true,
  keepSelectedFileName = false,
  fileNameOnlyDisplay = false,
  onChange,
  onClear,
}: TaskProofFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handleFileChange(file: File | undefined) {
    if (!file) {
      return
    }

    const validationError = validateProofFile(file)

    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setFileName(file.name)
      onChange(dataUrl)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not read this file.",
      )
    } finally {
      if (!keepSelectedFileName && inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  function handleClear() {
    setFileName(null)
    onClear()

    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      {fileNameOnlyDisplay ? (
        <>
          <Input
            id={id}
            ref={inputRef}
            type="file"
            accept={PROOF_IMAGE_ACCEPT}
            disabled={disabled}
            className="sr-only"
            onChange={(event) => {
              void handleFileChange(event.target.files?.[0])
            }}
          />
          <Label
            htmlFor={id}
            className="flex h-10 w-full cursor-pointer items-center rounded-lg border-2 border-border bg-background px-3 text-sm font-normal text-foreground shadow-none"
          >
            {fileName ?? (value ? "Image selected" : "Choose file")}
          </Label>
        </>
      ) : (
        <Input
          id={id}
          ref={inputRef}
          type="file"
          accept={PROOF_IMAGE_ACCEPT}
          disabled={disabled}
          onChange={(event) => {
            void handleFileChange(event.target.files?.[0])
          }}
        />
      )}
      {showHelpText ? (
        <p className="text-xs text-muted-foreground">
          PNG, JPG, or WebP up to 8 MB. GIF up to 5 MB.
        </p>
      ) : null}
      {showSelectedState && value ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-foreground">
            {fileName ? `Selected: ${fileName}` : "File ready to submit"}
          </p>
          <Button
            type="button"
            size="sm"
            variant="neutral"
            disabled={disabled}
            onClick={handleClear}
          >
            Remove file
          </Button>
        </div>
      ) : null}
    </div>
  )
}
