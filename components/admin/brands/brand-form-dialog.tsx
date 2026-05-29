"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createBrand, updateBrand } from "@/app/admin/brands/actions"
import type { BrandFormInput } from "@/app/admin/brands/schema"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Brand } from "@/lib/brands/brands"

type BrandFormDialogProps = {
  mode: "create" | "edit"
  open: boolean
  onOpenChange: (open: boolean) => void
  brand?: Brand | null
}

type BrandFormState = {
  name: string
  slug: string
  description: string
  brandImageUrl: string
  isActive: boolean
}

function getDefaultFormState(): BrandFormState {
  return {
    name: "",
    slug: "",
    description: "",
    brandImageUrl: "",
    isActive: true,
  }
}

function getBrandFormState(brand?: Brand | null): BrandFormState {
  if (!brand) {
    return getDefaultFormState()
  }

  return {
    name: brand.name,
    slug: brand.slug,
    description: brand.description ?? "",
    brandImageUrl: brand.brandImageUrl ?? "",
    isActive: brand.isActive,
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function BrandFormDialog({
  mode,
  open,
  onOpenChange,
  brand,
}: BrandFormDialogProps) {
  const router = useRouter()
  const isCreateMode = mode === "create"
  const [formState, setFormState] = useState<BrandFormState>(() =>
    getBrandFormState(brand)
  )
  const [isSlugTouched, setIsSlugTouched] = useState(!isCreateMode)
  const [isPending, startTransition] = useTransition()

  const title = isCreateMode ? "Create Brand" : "Edit Brand"
  const description = isCreateMode
    ? "Add a new brand for account access and approval analytics."
    : "Update brand details, image URL, and active status."

  const payload = useMemo<BrandFormInput>(
    () => ({
      name: formState.name,
      slug: formState.slug,
      description: formState.description,
      brandImageUrl: formState.brandImageUrl,
      isActive: formState.isActive,
    }),
    [formState]
  )

  function updateFormState(nextState: Partial<BrandFormState>) {
    setFormState((current) => ({ ...current, ...nextState }))
  }

  function handleNameChange(value: string) {
    setFormState((current) => ({
      ...current,
      name: value,
      slug: isSlugTouched ? current.slug : slugify(value),
    }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result =
        isCreateMode || !brand
          ? await createBrand(payload)
          : await updateBrand({ ...payload, brandId: brand.id })

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-brand-name`}>Brand Name</Label>
            <Input
              id={`${mode}-brand-name`}
              value={formState.name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="AP Creative"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-brand-slug`}>Slug</Label>
            <Input
              id={`${mode}-brand-slug`}
              value={formState.slug}
              onChange={(event) => {
                setIsSlugTouched(true)
                updateFormState({ slug: slugify(event.target.value) })
              }}
              placeholder="ap-creative"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-brand-description`}>Description</Label>
            <Textarea
              id={`${mode}-brand-description`}
              value={formState.description}
              onChange={(event) =>
                updateFormState({ description: event.target.value })
              }
              placeholder="Short brand description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-brand-image-url`}>Brand Image URL</Label>
            <Input
              id={`${mode}-brand-image-url`}
              value={formState.brandImageUrl}
              onChange={(event) =>
                updateFormState({ brandImageUrl: event.target.value })
              }
              placeholder="https://example.com/logo.png"
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Use an image URL for now. File uploads are not configured yet.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formState.isActive ? "active" : "inactive"}
              onValueChange={(value) =>
                updateFormState({ isActive: value === "active" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
              {isPending ? "Saving..." : "Save Brand"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
