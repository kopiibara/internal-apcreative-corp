"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  adsCampaignFormSchema,
  createAdsCampaignForEmployee,
  deleteAdsCampaignForEmployee,
  googleAdsImportSchema,
  importGoogleAdsMetricsForEmployee,
  updateAdsCampaignForEmployee,
} from "@/lib/ads-campaigns"
import { requireEmployee } from "@/lib/auth/auth-session"
import { enforceRateLimit } from "@/lib/rate-limit"

export type EmployeeAdsActionResult<T = unknown> = {
  success: boolean
  message: string
  data?: T
}

function revalidateEmployeeAdsCampaigns() {
  revalidatePath("/employee/ads-campaigns")
}

async function requireActiveEmployeeProfile() {
  const context = await requireEmployee()

  if (context.profile.status !== "ACTIVE") {
    throw new Error("Your account is not active.")
  }

  return context.profile
}

export async function createAdsCampaign(
  input: z.infer<typeof adsCampaignFormSchema>
): Promise<EmployeeAdsActionResult> {
  try {
    const profile = await requireActiveEmployeeProfile()
    const rateLimit = await enforceRateLimit({
      bucket: "ads-campaign:create",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    })

    if (!rateLimit.success) {
      return { success: false, message: rateLimit.message }
    }

    const parsed = adsCampaignFormSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid campaign data.",
      }
    }

    const campaign = await createAdsCampaignForEmployee(profile, parsed.data)
    revalidateEmployeeAdsCampaigns()

    return {
      success: true,
      message: "Campaign created successfully.",
      data: { campaign },
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create campaign.",
    }
  }
}

export async function updateAdsCampaign(
  input: z.infer<typeof adsCampaignFormSchema>
): Promise<EmployeeAdsActionResult> {
  try {
    const profile = await requireActiveEmployeeProfile()
    const rateLimit = await enforceRateLimit({
      bucket: "ads-campaign:update",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    })

    if (!rateLimit.success) {
      return { success: false, message: rateLimit.message }
    }

    const parsed = adsCampaignFormSchema
      .extend({ campaignId: z.coerce.number().int().positive() })
      .safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid campaign data.",
      }
    }

    const campaign = await updateAdsCampaignForEmployee(profile, parsed.data)
    revalidateEmployeeAdsCampaigns()

    return {
      success: true,
      message: "Campaign updated successfully.",
      data: { campaign },
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update campaign.",
    }
  }
}

export async function deleteAdsCampaign(
  campaignId: number
): Promise<EmployeeAdsActionResult> {
  try {
    const profile = await requireActiveEmployeeProfile()
    const parsedCampaignId = z.coerce.number().int().positive().parse(campaignId)
    const rateLimit = await enforceRateLimit({
      bucket: "ads-campaign:delete",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    })

    if (!rateLimit.success) {
      return { success: false, message: rateLimit.message }
    }

    await deleteAdsCampaignForEmployee(profile, parsedCampaignId)
    revalidateEmployeeAdsCampaigns()

    return {
      success: true,
      message: "Campaign deleted successfully.",
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to delete campaign.",
    }
  }
}

export async function importGoogleAdsCsvMetrics(
  input: z.infer<typeof googleAdsImportSchema>
): Promise<EmployeeAdsActionResult<{ importedRows: number }>> {
  try {
    const profile = await requireActiveEmployeeProfile()
    const rateLimit = await enforceRateLimit({
      bucket: "ads-campaign:google-import",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    })

    if (!rateLimit.success) {
      return { success: false, message: rateLimit.message }
    }

    const parsed = googleAdsImportSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid CSV import.",
      }
    }

    const importedRows = await importGoogleAdsMetricsForEmployee({
      profile,
      brandId: parsed.data.brandId,
      fileName: parsed.data.fileName,
      csvText: parsed.data.csvText,
    })
    revalidateEmployeeAdsCampaigns()

    return {
      success: true,
      message: `Imported ${importedRows} Google Ads row${
        importedRows === 1 ? "" : "s"
      }.`,
      data: { importedRows },
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to import Google Ads CSV.",
    }
  }
}
