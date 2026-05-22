"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createContentReport,
  updateContentReport,
} from "@/app/employee/approvals/actions"
import { platformOptions } from "@/app/employee/approvals/schema"
import { ContentTypeSelect } from "@/components/employee/approvals/approval-type-select"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ContentReport } from "@/types/content-report"

type ContentReportFormDialogProps = {
  mode: "create" | "edit"
  open: boolean
  onOpenChange: (open: boolean) => void
  report?: ContentReport | null
}

type FormState = {
  contentType: string
  platform: string
  contentInspo: string
  caption: string
  assetLink: string
  employeeComments: string
}

function getInitialFormState(report?: ContentReport | null): FormState {
  return {
    contentType: report?.contentType ?? "",
    platform: report?.platform ?? "Meta (Instagram and Facebook)",
    contentInspo: report?.contentInspo ?? "",
    caption: report?.caption ?? "",
    assetLink: report?.assetLink ?? "",
    employeeComments: report?.employeeComments ?? "",
  }
}

export function ContentReportFormDialog({
  mode,
  open,
  onOpenChange,
  report,
}: ContentReportFormDialogProps) {
  const router = useRouter()
  const [formState, setFormState] = useState<FormState>(() =>
    getInitialFormState(report)
  )
  const [isPending, startTransition] = useTransition()
  const isCreateMode = mode === "create"

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormState(getInitialFormState(report))
    }
    onOpenChange(nextOpen)
  }

  function updateField<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key]
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const payload = {
        contentType: formState.contentType,
        platform: formState.platform,
        contentInspo: formState.contentInspo,
        caption: formState.caption,
        assetLink: formState.assetLink,
        employeeComments: formState.employeeComments,
      }
      const result = isCreateMode
        ? await createContentReport(payload)
        : await updateContentReport({
          reportId: report?.id,
          ...payload,
        })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        router.refresh()
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isCreateMode ? "Create Approval Report" : "Edit Approval Report"}
          </DialogTitle>
          <DialogDescription>
            Submit the creative details for approval. Review and publishing
            fields are managed by admins.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Content Type</Label>
            <ContentTypeSelect
              value={formState.contentType}
              onValueChange={(value) => updateField("contentType", value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={formState.platform || undefined}
              onValueChange={(value) => updateField("platform", value)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platformOptions.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-content-inspo`}>Content Inspo</Label>
            <Textarea
              id={`${mode}-content-inspo`}
              value={formState.contentInspo}
              onChange={(event) =>
                updateField("contentInspo", event.target.value)
              }
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-caption`}>Caption</Label>
            <Textarea
              id={`${mode}-caption`}
              value={formState.caption}
              onChange={(event) => updateField("caption", event.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-asset-link`}>Asset Link</Label>
            <Input
              id={`${mode}-asset-link`}
              value={formState.assetLink}
              onChange={(event) => updateField("assetLink", event.target.value)}
              disabled={isPending}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-employee-comments`}>
              Employee Notes / Comments
            </Label>
            <Textarea
              id={`${mode}-employee-comments`}
              value={formState.employeeComments}
              onChange={(event) =>
                updateField("employeeComments", event.target.value)
              }
              disabled={isPending}
              maxLength={2000}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
