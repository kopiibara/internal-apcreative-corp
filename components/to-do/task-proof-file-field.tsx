"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { readFileAsDataUrl } from "@/lib/files/read-as-data-url"
import {
  TASK_PROOF_IMAGE_ACCEPT,
  validateTaskProofFile,
} from "@/lib/tasks/task-proof-media"

type TaskProofFileFieldProps = {
  value: string
  disabled?: boolean
  onChange: (dataUrl: string) => void
  onClear: () => void
}

export function TaskProofFileField({
  value,
  disabled = false,
  onChange,
  onClear,
}: TaskProofFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handleFileChange(file: File | undefined) {
    if (!file) {
      return
    }

    const validationError = validateTaskProofFile(file)

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
      if (inputRef.current) {
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
      <Label htmlFor="task-proof-image-file">Image proof</Label>
      <Input
        id="task-proof-image-file"
        ref={inputRef}
        type="file"
        accept={TASK_PROOF_IMAGE_ACCEPT}
        disabled={disabled}
        onChange={(event) => {
          void handleFileChange(event.target.files?.[0])
        }}
      />
      <p className="text-xs text-muted-foreground">
        PNG, JPG, WebP, or GIF up to 8 MB.
      </p>
      {value ? (
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
