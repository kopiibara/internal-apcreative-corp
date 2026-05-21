import { z } from "zod"

export const metaMonitoringFiltersSchema = z.object({
  pageId: z.string().trim().optional().nullable(),
})

export const registerMetaPageSchema = z.object({
  facebookPageId: z.string().trim().min(1, "Facebook Page ID is required."),
  pageName: z.string().trim().min(1, "Page name is required."),
  brandId: z.coerce.number().int().positive().optional().nullable(),
  accessTokenEnvKey: z.string().trim().optional().nullable(),
  webhookSubscribedFields: z
    .array(z.string().trim().min(1))
    .min(1, "At least one webhook field is required.")
    .default(["feed"]),
})
