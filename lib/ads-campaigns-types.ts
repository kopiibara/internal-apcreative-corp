import type { AccountType } from "@/lib/auth/account-type"

export const ADS_PLATFORMS = ["GOOGLE", "META", "TIKTOK"] as const
export const CAMPAIGN_STATUSES = ["ACTIVE", "PAUSED", "ENDED", "MISSING"] as const
export const CAMPAIGN_OBJECTIVES = [
  "Awareness",
  "Lead Gen",
  "Conversions",
  "Retargeting",
  "Traffic",
  "Engagement",
] as const

export type AdsPlatform = (typeof ADS_PLATFORMS)[number]
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export type AdsCampaignProfile = {
  id: number
  auth_user_id: string
  account_type: AccountType
}

export type AssignedAdsBrand = {
  id: number
  name: string
  isPrimary: boolean
}

export type AdsCampaign = {
  id: number
  profileId: number
  brandId: number
  brandName: string
  platform: AdsPlatform
  campaignName: string
  objective: string
  spend: number
  leads: number
  ctr: number | null
  roas: number | null
  status: CampaignStatus
  startDate: string | null
  endDate: string | null
  notes: string | null
}

export type GoogleAdsMetric = {
  id: number
  brandId: number
  metricDate: string
  impressions: number
  avgTargetCpa: number | null
  conversions: number
  cost: number
  sourceFileName: string | null
}

export type GoogleAdsSummary = {
  totalCost: number
  totalImpressions: number
  totalConversions: number
  avgCpa: number | null
  lastImportedAt: string | null
  lastSourceFileName: string | null
}
