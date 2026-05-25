"use client"

import { useMemo, useState, useTransition } from "react"
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
import {
  mergeContentReportBrandOptions,
  type ContentReportBrandOption,
} from "@/lib/content-reports"
import type { ContentReport } from "@/types/content-report"

type ContentReportFormDialogProps = {
  mode: "create" | "edit"
  open: boolean
  onOpenChange: (open: boolean) => void
  brandOptions: ContentReportBrandOption[]
  report?: ContentReport | null
}

type FormState = {
  brandId: string
  contentType: string
  platform: string
  contentInspo: string
  caption: string
  assetLink: string
  employeeComments: string
}

function getDefaultBrandId(
  formBrandOptions: ContentReportBrandOption[],
  report?: ContentReport | null,
) {
  if (report?.brandId) {
    return String(report.brandId)
  }

  const primaryBrand = formBrandOptions.find((brand) => brand.isPrimary)

  return String(primaryBrand?.id ?? formBrandOptions[0]?.id ?? "")
}

function getInitialFormState(
  formBrandOptions: ContentReportBrandOption[],
  report?: ContentReport | null,
): FormState {
  return {
    brandId: getDefaultBrandId(formBrandOptions, report),
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
  brandOptions,
  report,
}: ContentReportFormDialogProps) {
  const router = useRouter()
  const isCreateMode = mode === "create"
  const formBrandOptions = useMemo(
    () => mergeContentReportBrandOptions(brandOptions, report),
    [brandOptions, report],
  )
  const [formState, setFormState] = useState<FormState>(() =>
    getInitialFormState(formBrandOptions, report),
  )
  const [isPending, startTransition] = useTransition()
  const showBrandSelect = formBrandOptions.length > 1
  const showBrandReadOnly = !showBrandSelect && formBrandOptions.length === 1

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormState(getInitialFormState(formBrandOptions, report))
    }
    onOpenChange(nextOpen)
  }

  function updateField<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (showBrandSelect && !formState.brandId) {
      toast.error("Select a brand for this approval request.")
      return
    }

    const brandId = formState.brandId
      ? Number(formState.brandId)
      : formBrandOptions[0]?.id

    startTransition(async () => {
      const payload = {
        brandId,
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
            {isCreateMode
              ? "Submit the creative details for approval. Review and publishing fields are managed by admins."
              : "Update this report while it is still editable. You can change the brand if you are assigned to multiple brands."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {showBrandSelect ? (
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select
                value={formState.brandId || undefined}
                onValueChange={(value) => updateField("brandId", value)}
                disabled={isPending}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {formBrandOptions.map((brand) => (
                    <SelectItem key={brand.id} value={String(brand.id)}>
                      {brand.name}
                      {brand.isPrimary ? " (Primary)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : showBrandReadOnly ? (
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input value={formBrandOptions[0].name} disabled readOnly />
            </div>
          ) : null}

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
