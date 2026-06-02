"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createFormSubmission } from "@/app/admin/forms/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  FORM_DEFINITIONS,
  getDefaultFormPayload,
  type FormFieldDefinition,
} from "@/lib/forms/form-definitions"
import type { FormType } from "@/lib/forms/form-types"
import { cn } from "@/lib/utils"

type FormEntryDialogProps = {
  formType: FormType
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FormPayloadState = Record<string, string | string[]>

function FieldLabel({
  htmlFor,
  field,
}: {
  htmlFor?: string
  field: { label: string; required?: boolean }
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-xs font-normal uppercase tracking-[0.14em] text-muted-foreground"
    >
      {field.label}
      {field.required ? <span className="text-destructive"> *</span> : null}
    </Label>
  )
}

function getStringValue(state: FormPayloadState, key: string) {
  const value = state[key]
  return typeof value === "string" ? value : ""
}

function getArrayValue(state: FormPayloadState, key: string) {
  const value = state[key]
  return Array.isArray(value) ? value : []
}

export function FormEntryDialog({
  formType,
  open,
  onOpenChange,
}: FormEntryDialogProps) {
  const router = useRouter()
  const definition = FORM_DEFINITIONS[formType]
  const [payload, setPayload] = useState<FormPayloadState>(() =>
    getDefaultFormPayload(formType),
  )
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setPayload(getDefaultFormPayload(formType))
    }
  }, [formType, open])

  function updateField(key: string, value: string | string[]) {
    setPayload((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function toggleChecklistValue(key: string, option: string, checked: boolean) {
    const current = new Set(getArrayValue(payload, key))

    if (checked) {
      current.add(option)
    } else {
      current.delete(option)
    }

    updateField(key, [...current])
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await createFormSubmission({
        formType,
        payload,
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

  function renderField(field: FormFieldDefinition) {
    const fieldId = `form-${formType}-${field.key}`

    if (field.type === "textarea") {
      return (
        <div key={field.key} className={cn("space-y-2", field.fullWidth && "sm:col-span-2")}>
          <FieldLabel htmlFor={fieldId} field={field} />
          <Textarea
            id={fieldId}
            value={getStringValue(payload, field.key)}
            onChange={(event) => updateField(field.key, event.target.value)}
            placeholder={field.placeholder}
            className="min-h-28"
            disabled={isPending}
            required={field.required}
          />
        </div>
      )
    }

    if (field.type === "select") {
      return (
        <div key={field.key} className="space-y-2">
          <FieldLabel field={field} />
          <Select
            value={getStringValue(payload, field.key)}
            onValueChange={(value) => updateField(field.key, value)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (field.type === "date") {
      return (
        <div key={field.key} className="space-y-2">
          <FieldLabel field={field} />
          <DatePicker
            value={getStringValue(payload, field.key)}
            onChange={(value) => updateField(field.key, value)}
            disabled={isPending}
            className="w-full"
            placeholder="Pick a date"
          />
        </div>
      )
    }

    if (field.type === "checklist") {
      const selected = getArrayValue(payload, field.key)

      return (
        <div key={field.key} className={cn("space-y-3", field.fullWidth && "sm:col-span-2")}>
          <FieldLabel field={field} />
          <div className="grid gap-2 rounded-lg border-2 border-border bg-secondary-background p-3 sm:grid-cols-2">
            {field.options.map((option) => (
              <label
                key={option}
                className="flex min-w-0 cursor-pointer items-center gap-2 text-sm font-medium"
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) =>
                    toggleChecklistValue(field.key, option, checked === true)
                  }
                  disabled={isPending}
                />
                <span className="min-w-0 leading-snug">{option}</span>
              </label>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div key={field.key} className={cn("space-y-2", field.fullWidth && "sm:col-span-2")}>
        <FieldLabel htmlFor={fieldId} field={field} />
        <Input
          id={fieldId}
          type={field.type === "email" ? "email" : "text"}
          value={getStringValue(payload, field.key)}
          onChange={(event) => updateField(field.key, event.target.value)}
          placeholder={field.placeholder}
          disabled={isPending}
          required={field.required}
        />
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{definition.title}</DialogTitle>
          <DialogDescription>{definition.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody viewportClassName="px-5 py-4 sm:px-6">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              {definition.fields.map(renderField)}
            </div>
          </DialogBody>

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
              {isPending ? "Saving..." : definition.submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
