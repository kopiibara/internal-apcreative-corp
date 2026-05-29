"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  adsCampaignFormSchema,
  createAdsCampaignForEmployee,
  deleteAdsCampaignForEmployee,
  googleAdsImportSchema,
  importGoogleAdsMetricsForEmployee,
  updateAdsCampaignForEmployee,
} from "@/lib/ads-campaigns";
import type { AdsPlatform } from "@/lib/ads-campaigns-types";
import { parseMetaAdsCampaignCsv } from "@/lib/ads-campaigns/meta-ads-csv-parser";
import { requireEmployee } from "@/lib/auth/auth-session";
import { transaction } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

export type EmployeeAdsActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

const adsPlatformImportSchema = googleAdsImportSchema.extend({
  platform: z.enum(["GOOGLE", "META", "TIKTOK"]),
});

function revalidateEmployeeAdsCampaigns() {
  revalidatePath("/employee/ads-campaigns");
}

async function requireActiveEmployeeProfile() {
  const context = await requireEmployee();

  if (context.profile.status !== "ACTIVE") {
    throw new Error("Your account is not active.");
  }

  return context.profile;
}

export async function createAdsCampaign(
  input: z.infer<typeof adsCampaignFormSchema>,
): Promise<EmployeeAdsActionResult> {
  try {
    const profile = await requireActiveEmployeeProfile();
    const rateLimit = await enforceRateLimit({
      bucket: "ads-campaign:create",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return { success: false, message: rateLimit.message };
    }

    const parsed = adsCampaignFormSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid campaign data.",
      };
    }

    const campaign = await createAdsCampaignForEmployee(profile, parsed.data);
    revalidateEmployeeAdsCampaigns();

    return {
      success: true,
      message: "Campaign created successfully.",
      data: { campaign },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to create campaign.",
    };
  }
}

export async function updateAdsCampaign(
  input: z.infer<typeof adsCampaignFormSchema>,
): Promise<EmployeeAdsActionResult> {
  try {
    const profile = await requireActiveEmployeeProfile();
    const rateLimit = await enforceRateLimit({
      bucket: "ads-campaign:update",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return { success: false, message: rateLimit.message };
    }

    const parsed = adsCampaignFormSchema
      .extend({ campaignId: z.coerce.number().int().positive() })
      .safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid campaign data.",
      };
    }

    const campaign = await updateAdsCampaignForEmployee(profile, parsed.data);
    revalidateEmployeeAdsCampaigns();

    return {
      success: true,
      message: "Campaign updated successfully.",
      data: { campaign },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to update campaign.",
    };
  }
}

export async function deleteAdsCampaign(
  campaignId: number,
): Promise<EmployeeAdsActionResult> {
  try {
    const profile = await requireActiveEmployeeProfile();
    const parsedCampaignId = z.coerce
      .number()
      .int()
      .positive()
      .parse(campaignId);
    const rateLimit = await enforceRateLimit({
      bucket: "ads-campaign:delete",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return { success: false, message: rateLimit.message };
    }

    await deleteAdsCampaignForEmployee(profile, parsedCampaignId);
    revalidateEmployeeAdsCampaigns();

    return {
      success: true,
      message: "Campaign deleted successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to delete campaign.",
    };
  }
}

export async function importGoogleAdsCsvMetrics(
  input: z.infer<typeof googleAdsImportSchema>,
): Promise<
  EmployeeAdsActionResult<{
    importedRows: number;
    sourceTemplate: string;
    templateLabel: string;
    dateRange: { start: string; end: string } | null;
  }>
> {
  try {
    const profile = await requireActiveEmployeeProfile();
    const rateLimit = await enforceRateLimit({
      bucket: "ads-campaign:google-import",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return { success: false, message: rateLimit.message };
    }

    const parsed = googleAdsImportSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid CSV import.",
      };
    }

    const importResult = await importGoogleAdsMetricsForEmployee({
      profile,
      brandId: parsed.data.brandId,
      fileName: parsed.data.fileName,
      csvText: parsed.data.csvText,
    });

    revalidateEmployeeAdsCampaigns();

    const dateLabel = importResult.dateRange
      ? `${importResult.dateRange.start} to ${importResult.dateRange.end}`
      : "selected dates";

    return {
      success: true,
      message: `Imported ${importResult.rowCount} Google Ads row${
        importResult.rowCount === 1 ? "" : "s"
      } (${importResult.templateLabel}) for ${dateLabel}.`,
      data: {
        importedRows: importResult.rowCount,
        sourceTemplate: importResult.sourceTemplate,
        templateLabel: importResult.templateLabel,
        dateRange: importResult.dateRange,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to import Google Ads CSV.",
    };
  }
}

export async function importAdsPlatformCsv(
  input: z.infer<typeof adsPlatformImportSchema>,
): Promise<EmployeeAdsActionResult> {
  try {
    const profile = await requireActiveEmployeeProfile();

    const parsed = adsPlatformImportSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid CSV import.",
      };
    }

    const platform = parsed.data.platform as AdsPlatform;

    if (platform === "GOOGLE") {
      return importGoogleAdsCsvMetrics({
        brandId: parsed.data.brandId,
        fileName: parsed.data.fileName,
        csvText: parsed.data.csvText,
      });
    }

    if (platform === "TIKTOK") {
      return {
        success: false,
        message: "TikTok CSV import is not supported yet.",
      };
    }

    const rateLimit = await enforceRateLimit({
      bucket: "ads-campaign:meta-import",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return { success: false, message: rateLimit.message };
    }

    const importedCampaigns = parseMetaAdsCampaignCsv(parsed.data.csvText);

    if (importedCampaigns.length === 0) {
      return {
        success: false,
        message: "No Meta campaign rows were found in this CSV.",
      };
    }

    let createdCount = 0;
    let updatedCount = 0;

    await transaction(async (client) => {
      for (const campaign of importedCampaigns) {
        const existing = await client.query<{ id: number }>(
          `
          SELECT id
          FROM ads_campaigns
          WHERE profile_id = $1
            AND brand_id = $2
            AND platform = 'META'
            AND lower(campaign_name) = lower($3)
          LIMIT 1
          `,
          [profile.id, parsed.data.brandId, campaign.campaignName],
        );

        const existingCampaign = existing.rows[0];
        const importedNote = campaign.notes
          ? `${campaign.notes}\nImported from: ${parsed.data.fileName}`
          : `Imported from: ${parsed.data.fileName}`;

        if (existingCampaign) {
          await client.query(
            `
            UPDATE ads_campaigns
            SET
              objective = $2,
              spend = $3,
              leads = $4,
              ctr = $5,
              roas = $6,
              status = $7,
              start_date = $8::date,
              end_date = $9::date,
              notes = $10,
              updated_at = now()
            WHERE id = $1
            `,
            [
              existingCampaign.id,
              campaign.objective,
              campaign.spend,
              campaign.leads,
              campaign.ctr,
              campaign.roas,
              campaign.status,
              campaign.startDate,
              campaign.endDate,
              importedNote,
            ],
          );

          updatedCount += 1;
          continue;
        }

        await client.query(
          `
          INSERT INTO ads_campaigns (
            profile_id,
            brand_id,
            platform,
            campaign_name,
            objective,
            spend,
            leads,
            ctr,
            roas,
            status,
            start_date,
            end_date,
            notes
          )
          VALUES (
            $1,
            $2,
            'META',
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10::date,
            $11::date,
            $12
          )
          `,
          [
            profile.id,
            parsed.data.brandId,
            campaign.campaignName,
            campaign.objective,
            campaign.spend,
            campaign.leads,
            campaign.ctr,
            campaign.roas,
            campaign.status,
            campaign.startDate,
            campaign.endDate,
            importedNote,
          ],
        );

        createdCount += 1;
      }
    });

    revalidateEmployeeAdsCampaigns();

    return {
      success: true,
      message: `Meta CSV imported. ${createdCount} campaign${
        createdCount === 1 ? "" : "s"
      } created, ${updatedCount} campaign${
        updatedCount === 1 ? "" : "s"
      } updated.`,
      data: {
        importedRows: importedCampaigns.length,
        createdCount,
        updatedCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to import platform CSV.",
    };
  }
}
