import "server-only"

import { z } from "zod"

import { can } from "@/lib/permissions"
import { isEmployeeAccountType } from "@/lib/auth/account-type"
import {
  ADS_PLATFORMS,
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_STATUSES,
  type AdsCampaign,
  type AdsCampaignProfile,
  type AdsPlatform,
  type AssignedAdsBrand,
  type CampaignStatus,
  type GoogleAdsMetric,
  type GoogleAdsMetricAvailability,
  type GoogleAdsSummary,
} from "@/lib/ads-campaigns-types"
import { query, transaction } from "@/lib/db"
import { sanitizeFileName } from "@/lib/security/sanitize-text"
import {
  GOOGLE_ADS_MAX_CSV_BYTES,
  GOOGLE_ADS_MAX_CSV_ROWS,
  parseGoogleAdsCsv,
} from "@/lib/ads-campaigns/google-ads-csv-parser"
import { summarizeGoogleAdsMetrics } from "@/lib/ads-campaigns/google-ads-metrics-display"

export { ADS_PLATFORMS, CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES }
export type {
  AdsCampaign,
  AdsCampaignProfile,
  AdsPlatform,
  AssignedAdsBrand,
  CampaignStatus,
  GoogleAdsMetric,
  GoogleAdsMetricAvailability,
  GoogleAdsSummary,
}

type AssignedBrandRow = {
  id: number
  name: string
  is_primary: boolean
}

type AdsCampaignRow = {
  id: number
  profile_id: number
  brand_id: number
  brand_name: string
  platform: AdsPlatform
  campaign_name: string
  objective: string
  spend: string | number
  leads: number
  ctr: string | number | null
  roas: string | number | null
  status: CampaignStatus
  start_date: Date | string | null
  end_date: Date | string | null
  notes: string | null
}

type GoogleAdsMetricRow = {
  id: number
  brand_id: number
  metric_date: Date | string
  impressions: number
  avg_target_cpa: string | number | null
  conversions: string | number
  cost: string | number
  conversion_value: string | number | null
  conversion_value_per_click: string | number | null
  import_template: string | null
  raw_metrics: Record<string, string | number | null> | null
  source_file_name: string | null
}

type GoogleAdsSummaryRow = {
  total_cost: string | number | null
  total_impressions: string | number | null
  total_conversions: string | number | null
  total_conversion_value: string | number | null
  avg_cpa: string | number | null
  last_imported_at: Date | string | null
  last_source_file_name: string | null
  last_import_template: string | null
}

export const adsCampaignFormSchema = z.object({
  campaignId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive(),
  platform: z.enum(ADS_PLATFORMS),
  campaignName: z.string().trim().min(1, "Campaign name is required."),
  objective: z.string().trim().min(1, "Objective is required."),
  spend: z.coerce.number().min(0).default(0),
  leads: z.coerce.number().int().min(0).default(0),
  ctr: z
    .union([z.coerce.number().min(0), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value === "" || value == null ? null : Number(value))),
  roas: z
    .union([z.coerce.number().min(0), z.literal(""), z.null(), z.undefined()])
    .transform((value) => (value === "" || value == null ? null : Number(value))),
  status: z.enum(CAMPAIGN_STATUSES),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be 2000 characters or fewer.")
    .optional()
    .transform((value) => value || null),
})

export const googleAdsImportSchema = z.object({
  brandId: z.coerce.number().int().positive(),
  fileName: z.string().trim().min(1, "File name is required."),
  csvText: z
    .string()
    .trim()
    .min(1, "CSV file is empty.")
    .max(GOOGLE_ADS_MAX_CSV_BYTES, "CSV file is too large."),
})

export async function getAssignedAdsBrands(profileId: number) {
  const result = await query<AssignedBrandRow>(
    `
    SELECT b.id, b.name, uba.is_primary
    FROM user_brand_access uba
    JOIN brand b ON b.id = uba.brand_id
    WHERE uba.profile_id = $1
      AND uba.is_active = true
      AND b.is_active = true
    ORDER BY uba.is_primary DESC, b.name ASC, b.id ASC
    `,
    [profileId]
  )

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    isPrimary: row.is_primary,
  }))
}

export async function assertEmployeeBrandAccess(
  profile: AdsCampaignProfile,
  brandId: number
) {
  if (!isEmployeeAccountType(profile.account_type)) {
    throw new Error("Only employee accounts can manage employee campaigns.")
  }

  const result = await query<{ has_access: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM user_brand_access
      WHERE profile_id = $1
        AND brand_id = $2
        AND is_active = true
    ) AS has_access
    `,
    [profile.id, brandId]
  )

  if (!result.rows[0]?.has_access) {
    throw new Error("You do not have access to this brand.")
  }
}

async function assertAdsCampaignPermission(
  profile: AdsCampaignProfile,
  permissionKey: string,
  brandId?: number
) {
  const allowed = await can(profile.auth_user_id, permissionKey, brandId)

  if (!allowed) {
    throw new Error("You do not have permission to manage Ads Campaigns.")
  }
}

function toDateKey(value: Date | string | null) {
  if (!value) {
    return null
  }

  if (typeof value === "string") {
    return value.slice(0, 10)
  }

  return value.toISOString().slice(0, 10)
}

function toNumber(value: string | number | null | undefined) {
  if (value == null) {
    return null
  }

  return Number(value)
}

function mapCampaign(row: AdsCampaignRow): AdsCampaign {
  return {
    id: row.id,
    profileId: row.profile_id,
    brandId: row.brand_id,
    brandName: row.brand_name,
    platform: row.platform,
    campaignName: row.campaign_name,
    objective: row.objective,
    spend: Number(row.spend),
    leads: Number(row.leads),
    ctr: toNumber(row.ctr),
    roas: toNumber(row.roas),
    status: row.status,
    startDate: toDateKey(row.start_date),
    endDate: toDateKey(row.end_date),
    notes: row.notes,
  }
}

function mapMetric(row: GoogleAdsMetricRow): GoogleAdsMetric {
  return {
    id: row.id,
    brandId: row.brand_id,
    metricDate: toDateKey(row.metric_date) ?? "",
    impressions: Number(row.impressions),
    avgTargetCpa: toNumber(row.avg_target_cpa),
    conversions: Number(row.conversions),
    cost: Number(row.cost),
    conversionValue: toNumber(row.conversion_value),
    conversionValuePerClick: toNumber(row.conversion_value_per_click),
    importTemplate: row.import_template,
    rawMetrics: row.raw_metrics ?? {},
    sourceFileName: row.source_file_name,
  }
}

function buildSummaryFromMetrics(
  metrics: GoogleAdsMetric[],
  summaryRow?: GoogleAdsSummaryRow | null,
): GoogleAdsSummary {
  const computed = summarizeGoogleAdsMetrics(metrics)

  return {
    ...computed,
    lastImportedAt: summaryRow?.last_imported_at
      ? new Date(summaryRow.last_imported_at).toISOString()
      : null,
    lastSourceFileName: summaryRow?.last_source_file_name ?? null,
    lastImportTemplate:
      summaryRow?.last_import_template ?? computed.lastImportTemplate,
  }
}

function emptyGoogleAdsSummary(): GoogleAdsSummary {
  return buildSummaryFromMetrics([])
}

export async function getEmployeeAdsCampaignPageData(profile: AdsCampaignProfile) {
  await assertAdsCampaignPermission(profile, "ads_campaigns.view")

  const brands = await getAssignedAdsBrands(profile.id)
  const brandIds = brands.map((brand) => brand.id)

  if (brandIds.length === 0) {
    return {
      brands,
      campaigns: [] as AdsCampaign[],
      metrics: [] as GoogleAdsMetric[],
      summary: emptyGoogleAdsSummary(),
    }
  }

  const [campaignRows, metricRows, summaryRows] = await Promise.all([
    query<AdsCampaignRow>(
      `
      SELECT
        ac.id,
        ac.profile_id,
        ac.brand_id,
        b.name AS brand_name,
        ac.platform,
        ac.campaign_name,
        ac.objective,
        ac.spend,
        ac.leads,
        ac.ctr,
        ac.roas,
        ac.status,
        ac.start_date,
        ac.end_date,
        ac.notes
      FROM ads_campaigns ac
      JOIN brand b ON b.id = ac.brand_id
      WHERE ac.profile_id = $1
        AND ac.brand_id = ANY($2::int[])
      ORDER BY ac.updated_at DESC, ac.id DESC
      `,
      [profile.id, brandIds]
    ),
    query<GoogleAdsMetricRow>(
      `
      SELECT
        id,
        brand_id,
        metric_date,
        impressions,
        avg_target_cpa,
        conversions,
        cost,
        conversion_value,
        conversion_value_per_click,
        import_template,
        raw_metrics,
        source_file_name
      FROM google_ads_daily_metrics
      WHERE profile_id = $1
        AND brand_id = ANY($2::int[])
      ORDER BY metric_date ASC, id ASC
      `,
      [profile.id, brandIds]
    ),
    query<GoogleAdsSummaryRow>(
      `
      SELECT
        COALESCE(SUM(cost), 0) AS total_cost,
        COALESCE(SUM(impressions), 0) AS total_impressions,
        COALESCE(SUM(conversions), 0) AS total_conversions,
        CASE
          WHEN SUM(conversions) > 0 THEN SUM(cost) / SUM(conversions)
          ELSE NULL
        END AS avg_cpa,
        MAX(created_at) AS last_imported_at,
        (
          SELECT source_file_name
          FROM google_ads_daily_metrics
          WHERE profile_id = $1
            AND brand_id = ANY($2::int[])
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        ) AS last_source_file_name,
        (
          SELECT import_template
          FROM google_ads_daily_metrics
          WHERE profile_id = $1
            AND brand_id = ANY($2::int[])
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        ) AS last_import_template,
        COALESCE(SUM(conversion_value), 0) AS total_conversion_value
      FROM google_ads_daily_metrics
      WHERE profile_id = $1
        AND brand_id = ANY($2::int[])
      `,
      [profile.id, brandIds]
    ),
  ])
  const summaryRow = summaryRows.rows[0]
  const metrics = metricRows.rows.map(mapMetric)

  return {
    brands,
    campaigns: campaignRows.rows.map(mapCampaign),
    metrics,
    summary: buildSummaryFromMetrics(metrics, summaryRow),
  }
}

export async function getAdminAdsCampaignPageData(profile: AdsCampaignProfile) {
  await assertAdsCampaignPermission(profile, "ads_campaigns.view")

  const [brandRows, campaignRows, metricRows, summaryRows] = await Promise.all([
    query<AssignedBrandRow>(
      `
      SELECT id, name, false AS is_primary
      FROM brand
      WHERE is_active = true
      ORDER BY name ASC, id ASC
      `
    ),
    query<AdsCampaignRow>(
      `
      SELECT
        ac.id,
        ac.profile_id,
        ac.brand_id,
        b.name AS brand_name,
        ac.platform,
        ac.campaign_name,
        ac.objective,
        ac.spend,
        ac.leads,
        ac.ctr,
        ac.roas,
        ac.status,
        ac.start_date,
        ac.end_date,
        ac.notes
      FROM ads_campaigns ac
      JOIN brand b ON b.id = ac.brand_id
      ORDER BY ac.updated_at DESC, ac.id DESC
      `
    ),
    query<GoogleAdsMetricRow>(
      `
      SELECT
        id,
        brand_id,
        metric_date,
        impressions,
        avg_target_cpa,
        conversions,
        cost,
        conversion_value,
        conversion_value_per_click,
        import_template,
        raw_metrics,
        source_file_name
      FROM google_ads_daily_metrics
      ORDER BY metric_date ASC, id ASC
      `
    ),
    query<GoogleAdsSummaryRow>(
      `
      SELECT
        COALESCE(SUM(cost), 0) AS total_cost,
        COALESCE(SUM(impressions), 0) AS total_impressions,
        COALESCE(SUM(conversions), 0) AS total_conversions,
        CASE
          WHEN SUM(conversions) > 0 THEN SUM(cost) / SUM(conversions)
          ELSE NULL
        END AS avg_cpa,
        MAX(created_at) AS last_imported_at,
        (
          SELECT source_file_name
          FROM google_ads_daily_metrics
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        ) AS last_source_file_name,
        (
          SELECT import_template
          FROM google_ads_daily_metrics
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        ) AS last_import_template,
        COALESCE(SUM(conversion_value), 0) AS total_conversion_value
      FROM google_ads_daily_metrics
      `
    ),
  ])
  const summaryRow = summaryRows.rows[0]
  const metrics = metricRows.rows.map(mapMetric)

  return {
    brands: brandRows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      isPrimary: row.is_primary,
    })),
    campaigns: campaignRows.rows.map(mapCampaign),
    metrics,
    summary: buildSummaryFromMetrics(metrics, summaryRow),
  }
}

export async function createAdsCampaignForEmployee(
  profile: AdsCampaignProfile,
  input: z.infer<typeof adsCampaignFormSchema>
) {
  await assertAdsCampaignPermission(
    profile,
    "ads_campaigns.create",
    input.brandId
  )
  await assertEmployeeBrandAccess(profile, input.brandId)

  const result = await query<AdsCampaignRow>(
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
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING
      id,
      profile_id,
      brand_id,
      (SELECT name FROM brand WHERE id = ads_campaigns.brand_id) AS brand_name,
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
    `,
    [
      profile.id,
      input.brandId,
      input.platform,
      input.campaignName,
      input.objective,
      input.spend,
      input.leads,
      input.ctr,
      input.roas,
      input.status,
      input.startDate,
      input.endDate,
      input.notes,
    ]
  )

  return mapCampaign(result.rows[0])
}

export async function updateAdsCampaignForEmployee(
  profile: AdsCampaignProfile,
  input: z.infer<typeof adsCampaignFormSchema> & { campaignId: number }
) {
  await assertAdsCampaignPermission(
    profile,
    "ads_campaigns.update",
    input.brandId
  )
  await assertEmployeeBrandAccess(profile, input.brandId)

  const ownership = await query<{ brand_id: number }>(
    `
    SELECT brand_id
    FROM ads_campaigns
    WHERE id = $1
      AND profile_id = $2
    LIMIT 1
    `,
    [input.campaignId, profile.id]
  )

  const current = ownership.rows[0]

  if (!current) {
    throw new Error("Campaign was not found.")
  }

  await assertEmployeeBrandAccess(profile, current.brand_id)
  await assertAdsCampaignPermission(
    profile,
    "ads_campaigns.update",
    current.brand_id
  )

  const result = await query<AdsCampaignRow>(
    `
    UPDATE ads_campaigns
    SET
      brand_id = $3,
      platform = $4,
      campaign_name = $5,
      objective = $6,
      spend = $7,
      leads = $8,
      ctr = $9,
      roas = $10,
      status = $11,
      start_date = $12,
      end_date = $13,
      notes = $14,
      updated_at = now()
    WHERE id = $1
      AND profile_id = $2
    RETURNING
      id,
      profile_id,
      brand_id,
      (SELECT name FROM brand WHERE id = ads_campaigns.brand_id) AS brand_name,
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
    `,
    [
      input.campaignId,
      profile.id,
      input.brandId,
      input.platform,
      input.campaignName,
      input.objective,
      input.spend,
      input.leads,
      input.ctr,
      input.roas,
      input.status,
      input.startDate,
      input.endDate,
      input.notes,
    ]
  )

  return mapCampaign(result.rows[0])
}

export async function deleteAdsCampaignForEmployee(
  profile: AdsCampaignProfile,
  campaignId: number
) {
  const result = await query<{ brand_id: number }>(
    `
    SELECT brand_id
    FROM ads_campaigns
    WHERE id = $1
      AND profile_id = $2
    LIMIT 1
    `,
    [campaignId, profile.id]
  )
  const campaign = result.rows[0]

  if (!campaign) {
    throw new Error("Campaign was not found.")
  }

  await assertEmployeeBrandAccess(profile, campaign.brand_id)
  await assertAdsCampaignPermission(
    profile,
    "ads_campaigns.delete",
    campaign.brand_id
  )

  await query(
    `
    DELETE FROM ads_campaigns
    WHERE id = $1
      AND profile_id = $2
    `,
    [campaignId, profile.id]
  )
}

export { parseGoogleAdsCsv, previewGoogleAdsCsv } from "@/lib/ads-campaigns/google-ads-csv-parser"

export async function importGoogleAdsMetricsForEmployee({
  profile,
  brandId,
  fileName,
  csvText,
}: {
  profile: AdsCampaignProfile
  brandId: number
  fileName: string
  csvText: string
}) {
  await assertAdsCampaignPermission(profile, "ads_campaigns.import", brandId)
  await assertEmployeeBrandAccess(profile, brandId)

  const safeFileName = sanitizeFileName(fileName)

  if (csvText.length > GOOGLE_ADS_MAX_CSV_BYTES) {
    throw new Error("CSV file is too large. Maximum size is 2 MB.")
  }

  const parsed = parseGoogleAdsCsv(csvText)

  if (parsed.rowCount > GOOGLE_ADS_MAX_CSV_ROWS) {
    throw new Error(
      `CSV exceeds the ${GOOGLE_ADS_MAX_CSV_ROWS} row import limit.`,
    )
  }

  await transaction(async (client) => {
    for (const row of parsed.rows) {
      await client.query(
        `
        INSERT INTO google_ads_daily_metrics (
          profile_id,
          brand_id,
          metric_date,
          impressions,
          avg_target_cpa,
          conversions,
          cost,
          conversion_value,
          conversion_value_per_click,
          import_template,
          raw_metrics,
          source_file_name
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (profile_id, brand_id, metric_date)
        DO UPDATE SET
          impressions = EXCLUDED.impressions,
          avg_target_cpa = EXCLUDED.avg_target_cpa,
          conversions = EXCLUDED.conversions,
          cost = EXCLUDED.cost,
          conversion_value = EXCLUDED.conversion_value,
          conversion_value_per_click = EXCLUDED.conversion_value_per_click,
          import_template = EXCLUDED.import_template,
          raw_metrics = EXCLUDED.raw_metrics,
          source_file_name = EXCLUDED.source_file_name,
          updated_at = now()
        `,
        [
          profile.id,
          brandId,
          row.metricDate,
          row.impressions,
          row.avgTargetCpa,
          row.conversions,
          row.cost,
          row.conversionValue,
          row.conversionValuePerClick,
          row.sourceTemplate,
          JSON.stringify(row.rawMetrics),
          safeFileName,
        ],
      )
    }
  })

  return parsed
}
