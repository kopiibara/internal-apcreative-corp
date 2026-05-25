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
  type GoogleAdsSummary,
} from "@/lib/ads-campaigns-types"
import { query, transaction } from "@/lib/db"

export { ADS_PLATFORMS, CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES }
export type {
  AdsCampaign,
  AdsCampaignProfile,
  AdsPlatform,
  AssignedAdsBrand,
  CampaignStatus,
  GoogleAdsMetric,
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
  source_file_name: string | null
}

type GoogleAdsSummaryRow = {
  total_cost: string | number | null
  total_impressions: string | number | null
  total_conversions: string | number | null
  avg_cpa: string | number | null
  last_imported_at: Date | string | null
  last_source_file_name: string | null
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
  csvText: z.string().trim().min(1, "CSV file is empty."),
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
    sourceFileName: row.source_file_name,
  }
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
      summary: {
        totalCost: 0,
        totalImpressions: 0,
        totalConversions: 0,
        avgCpa: null,
        lastImportedAt: null,
        lastSourceFileName: null,
      } satisfies GoogleAdsSummary,
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
        ) AS last_source_file_name
      FROM google_ads_daily_metrics
      WHERE profile_id = $1
        AND brand_id = ANY($2::int[])
      `,
      [profile.id, brandIds]
    ),
  ])
  const summaryRow = summaryRows.rows[0]

  return {
    brands,
    campaigns: campaignRows.rows.map(mapCampaign),
    metrics: metricRows.rows.map(mapMetric),
    summary: {
      totalCost: Number(summaryRow?.total_cost ?? 0),
      totalImpressions: Number(summaryRow?.total_impressions ?? 0),
      totalConversions: Number(summaryRow?.total_conversions ?? 0),
      avgCpa: toNumber(summaryRow?.avg_cpa),
      lastImportedAt: summaryRow?.last_imported_at
        ? new Date(summaryRow.last_imported_at).toISOString()
        : null,
      lastSourceFileName: summaryRow?.last_source_file_name ?? null,
    },
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
        ) AS last_source_file_name
      FROM google_ads_daily_metrics
      `
    ),
  ])
  const summaryRow = summaryRows.rows[0]

  return {
    brands: brandRows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      isPrimary: row.is_primary,
    })),
    campaigns: campaignRows.rows.map(mapCampaign),
    metrics: metricRows.rows.map(mapMetric),
    summary: {
      totalCost: Number(summaryRow?.total_cost ?? 0),
      totalImpressions: Number(summaryRow?.total_impressions ?? 0),
      totalConversions: Number(summaryRow?.total_conversions ?? 0),
      avgCpa: toNumber(summaryRow?.avg_cpa),
      lastImportedAt: summaryRow?.last_imported_at
        ? new Date(summaryRow.last_imported_at).toISOString()
        : null,
      lastSourceFileName: summaryRow?.last_source_file_name ?? null,
    },
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

type ParsedGoogleAdsMetric = {
  metricDate: string
  impressions: number
  avgTargetCpa: number | null
  conversions: number
  cost: number
}

function splitCsvLine(line: string) {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const nextCharacter = line[index + 1]

    if (character === '"' && nextCharacter === '"') {
      current += '"'
      index += 1
      continue
    }

    if (character === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += character
  }

  cells.push(current.trim())
  return cells
}

function parseCurrency(value: string, nullable = false) {
  const normalized = value.trim()

  if (!normalized || normalized === "—" || normalized === "-") {
    return nullable ? null : 0
  }

  const numeric = Number(normalized.replace(/[₱,\s]/g, ""))

  if (Number.isNaN(numeric)) {
    throw new Error(`Invalid currency value: ${value}`)
  }

  return numeric
}

function parseNumberCell(value: string, columnName: string) {
  const numeric = Number(value.trim().replace(/,/g, ""))

  if (Number.isNaN(numeric)) {
    throw new Error(`Invalid ${columnName} value: ${value}`)
  }

  return numeric
}

function parseGoogleAdsDate(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Date value: ${value}`)
  }

  return parsed.toISOString().slice(0, 10)
}

export function parseGoogleAdsCsv(csvText: string) {
  const rows = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (rows.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.")
  }

  const headers = splitCsvLine(rows[0])
  const requiredColumns = ["Date", "Impr.", "Avg. target CPA", "Conversions", "Cost"]
  const columnIndex = new Map(headers.map((header, index) => [header, index]))
  const missingColumn = requiredColumns.find((column) => !columnIndex.has(column))

  if (missingColumn) {
    throw new Error(`CSV is missing required column: ${missingColumn}`)
  }

  const parsedRows: ParsedGoogleAdsMetric[] = []

  for (const line of rows.slice(1)) {
    const cells = splitCsvLine(line)

    if (cells.every((cell) => !cell.trim())) {
      continue
    }

    const getCell = (column: string) => cells[columnIndex.get(column) ?? -1] ?? ""

    parsedRows.push({
      metricDate: parseGoogleAdsDate(getCell("Date")),
      impressions: parseNumberCell(getCell("Impr."), "Impr."),
      avgTargetCpa: parseCurrency(getCell("Avg. target CPA"), true),
      conversions: parseNumberCell(getCell("Conversions"), "Conversions"),
      cost: parseCurrency(getCell("Cost")) ?? 0,
    })
  }

  if (parsedRows.length === 0) {
    throw new Error("CSV did not contain any importable rows.")
  }

  return parsedRows
}

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
  const parsedRows = parseGoogleAdsCsv(csvText)

  await transaction(async (client) => {
    for (const row of parsedRows) {
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
          source_file_name
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (profile_id, brand_id, metric_date, source_file_name)
        DO UPDATE SET
          impressions = EXCLUDED.impressions,
          avg_target_cpa = EXCLUDED.avg_target_cpa,
          conversions = EXCLUDED.conversions,
          cost = EXCLUDED.cost,
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
          fileName,
        ]
      )
    }
  })

  return parsedRows.length
}
