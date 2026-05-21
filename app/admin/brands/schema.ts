import { z } from "zod"

const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => {
      if (!value) {
        return true
      }

      try {
        const url = new URL(value)
        return url.protocol === "http:" || url.protocol === "https:"
      } catch {
        return false
      }
    },
    { message: "Brand image URL must be a valid http or https URL." }
  )

export const brandStatusFilters = ["all", "active", "inactive"] as const

export const brandFormSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must use lowercase letters, numbers, and hyphens."
    ),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  brandImageUrl: optionalUrlSchema,
  isActive: z.boolean(),
})

export const createBrandSchema = brandFormSchema

export const updateBrandSchema = brandFormSchema.extend({
  brandId: z.coerce.number().int().positive(),
})

export const brandIdSchema = z.object({
  brandId: z.coerce.number().int().positive(),
})

export type BrandFormInput = z.infer<typeof brandFormSchema>
export type CreateBrandInput = z.infer<typeof createBrandSchema>
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>
export type BrandStatusFilter = (typeof brandStatusFilters)[number]
