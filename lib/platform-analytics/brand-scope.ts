import "server-only";

import {
  getEffectiveBrandAccessForProfile,
  profileHasAllBrandsAccess,
} from "@/lib/brand-access/effective-brand-access";
import { query } from "@/lib/db";
import type { MetaBusinessPageDashboard } from "@/lib/meta/page-analytics";
import type { TikTokBrandDashboard } from "@/lib/tiktok/dashboard-types";
import {
  getMetaPageByFacebookPageId,
  getMetaPageByKey,
  type MetaPageConfigKey,
} from "@/lib/meta/pages-config";
import type { PlatformAnalyticsDashboardData } from "@/lib/platform-analytics/types";

export type PlatformAnalyticsBrandScope = {
  hasAllBrandsAccess: boolean;
  allowedBrandSlugs: string[];
  allowedBrandIds: number[];
  metaPageBrandIds: Record<string, number>;
};

export type PlatformAnalyticsBrandScopeUi = {
  hasAllBrandsAccess: boolean;
  defaultMetaPageKey: string;
  showAllPagesOption: boolean;
  assignedBrandNames: string[];
  scopeDescription: string;
};

function normalizeBrandSlug(slug: string) {
  return slug.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

async function loadMetaPageBrandIdsByKey(): Promise<Record<string, number>> {
  const result = await query<{ facebook_page_id: string; brand_id: number | null }>(
    `
    SELECT facebook_page_id, brand_id
    FROM meta_facebook_page
    WHERE is_active = true
      AND brand_id IS NOT NULL
    `,
  );

  const map: Record<string, number> = {};

  for (const row of result.rows) {
    const config = getMetaPageByFacebookPageId(row.facebook_page_id);

    if (config?.key && row.brand_id != null) {
      map[config.key] = row.brand_id;
    }
  }

  return map;
}

function slugMatchesAllowedBrand(
  candidate: string,
  allowedBrandSlugs: string[],
  allowedBrandIds: number[],
  brandId?: number | null,
) {
  const normalizedCandidate = normalizeBrandSlug(candidate);

  if (
    brandId != null &&
    allowedBrandIds.some((allowedId) => allowedId === brandId)
  ) {
    return true;
  }

  return allowedBrandSlugs.some(
    (slug) => normalizeBrandSlug(slug) === normalizedCandidate,
  );
}

export async function getPlatformAnalyticsBrandScope(
  profileId: number,
): Promise<PlatformAnalyticsBrandScope> {
  const metaPageBrandIds = await loadMetaPageBrandIdsByKey();

  if (await profileHasAllBrandsAccess(profileId)) {
    return {
      hasAllBrandsAccess: true,
      allowedBrandSlugs: [],
      allowedBrandIds: [],
      metaPageBrandIds,
    };
  }

  const effectiveBrands = await getEffectiveBrandAccessForProfile(profileId);

  if (effectiveBrands.length === 0) {
    return {
      hasAllBrandsAccess: false,
      allowedBrandSlugs: [],
      allowedBrandIds: [],
      metaPageBrandIds,
    };
  }

  const brandIds = effectiveBrands.map((brand) => brand.brandId);
  const slugResult = await query<{ id: number; slug: string }>(
    `
    SELECT id, slug
    FROM brand
    WHERE id = ANY($1::int[])
      AND is_active = true
    `,
    [brandIds],
  );

  return {
    hasAllBrandsAccess: false,
    allowedBrandSlugs: slugResult.rows.map((row) => row.slug),
    allowedBrandIds: slugResult.rows.map((row) => row.id),
    metaPageBrandIds,
  };
}

export function getMetaPageBrandSlug(pageKey: MetaPageConfigKey): string | null {
  return getMetaPageByKey(pageKey)?.brandSlug ?? null;
}

export function isMetaPageKeyAllowed(
  pageKey: MetaPageConfigKey,
  scope: PlatformAnalyticsBrandScope,
): boolean {
  if (scope.hasAllBrandsAccess) {
    return true;
  }

  const config = getMetaPageByKey(pageKey);

  if (!config) {
    return false;
  }

  const mappedBrandId = scope.metaPageBrandIds[pageKey];

  return (
    slugMatchesAllowedBrand(
      config.brandSlug,
      scope.allowedBrandSlugs,
      scope.allowedBrandIds,
      mappedBrandId,
    ) ||
    slugMatchesAllowedBrand(
      pageKey,
      scope.allowedBrandSlugs,
      scope.allowedBrandIds,
      mappedBrandId,
    ) ||
    slugMatchesAllowedBrand(
      config.displayName,
      scope.allowedBrandSlugs,
      scope.allowedBrandIds,
      mappedBrandId,
    )
  );
}

export function isFacebookPageIdAllowed(
  facebookPageId: string,
  scope: PlatformAnalyticsBrandScope,
): boolean {
  if (scope.hasAllBrandsAccess) {
    return true;
  }

  const config = getMetaPageByFacebookPageId(facebookPageId);

  if (!config) {
    return false;
  }

  return isMetaPageKeyAllowed(config.key, scope);
}

export function isBrandIdAllowed(
  brandId: number,
  scope: PlatformAnalyticsBrandScope,
): boolean {
  if (scope.hasAllBrandsAccess) {
    return true;
  }

  return scope.allowedBrandIds.includes(brandId);
}

export function filterTikTokBrandsByScope(
  brands: TikTokBrandDashboard[],
  scope: PlatformAnalyticsBrandScope,
): TikTokBrandDashboard[] {
  if (scope.hasAllBrandsAccess) {
    return brands;
  }

  return brands.filter((brand) => isBrandIdAllowed(brand.brandId, scope));
}

export function filterMetaBusinessPagesByScope(
  pages: MetaBusinessPageDashboard[],
  scope: PlatformAnalyticsBrandScope,
): MetaBusinessPageDashboard[] {
  if (scope.hasAllBrandsAccess) {
    return pages;
  }

  return pages.filter((page) => isMetaPageKeyAllowed(page.key, scope));
}

export async function toPlatformAnalyticsBrandScopeUi(
  scope: PlatformAnalyticsBrandScope,
  allowedPages: MetaBusinessPageDashboard[],
  profileId: number,
): Promise<PlatformAnalyticsBrandScopeUi> {
  const effectiveBrands = await getEffectiveBrandAccessForProfile(profileId);
  const assignedBrandNames = effectiveBrands.map((brand) => brand.brandName);

  if (scope.hasAllBrandsAccess) {
    return {
      hasAllBrandsAccess: true,
      defaultMetaPageKey: "all",
      showAllPagesOption: true,
      assignedBrandNames,
      scopeDescription: "All brands",
    };
  }

  const scopeDescription =
    assignedBrandNames.length > 0
      ? assignedBrandNames.join(", ")
      : "No brands assigned";

  if (allowedPages.length <= 1) {
    return {
      hasAllBrandsAccess: false,
      defaultMetaPageKey: allowedPages[0]?.key ?? "all",
      showAllPagesOption: false,
      assignedBrandNames,
      scopeDescription,
    };
  }

  return {
    hasAllBrandsAccess: false,
    defaultMetaPageKey: allowedPages[0]?.key ?? "all",
    showAllPagesOption: false,
    assignedBrandNames,
    scopeDescription,
  };
}

function buildEmptyNonMetaSlice(
  platform: PlatformAnalyticsDashboardData["platform"],
): Pick<
  PlatformAnalyticsDashboardData,
  | "isDemo"
  | "accounts"
  | "connection"
  | "overviewKpis"
  | "engagementKpis"
  | "audienceInsightKpis"
  | "growthSnapshots"
  | "contentPerformance"
  | "campaignPerformance"
  | "activityLogs"
  | "syncHistory"
  | "charts"
  | "metaNeedsBootstrap"
  | "metaBusinessPages"
  | "tiktokBrandAnalytics"
> {
  return {
    isDemo: false,
    accounts: [],
    connection: {
      platform: platform as PlatformAnalyticsDashboardData["connection"]["platform"],
      isDemo: false,
      apiConnected: false,
      webhookSupported: false,
      webhookConfigured: false,
      cronConfigured: false,
      connectedAccountsCount: 0,
      lastSyncAt: null,
      lastSyncError: null,
      tokenStatus: "Missing",
      syncHealth: "OK",
      statusRows: [],
    },
    overviewKpis: [],
    engagementKpis: [],
    audienceInsightKpis: [],
    growthSnapshots: [],
    contentPerformance: [],
    campaignPerformance: [],
    activityLogs: [],
    syncHistory: [],
    charts: [],
    metaNeedsBootstrap: false,
    metaBusinessPages: [],
    tiktokBrandAnalytics: [],
  };
}

export function applyBrandScopeToDashboardData(
  data: PlatformAnalyticsDashboardData,
  scope: PlatformAnalyticsBrandScope,
): PlatformAnalyticsDashboardData {
  if (scope.hasAllBrandsAccess) {
    return data;
  }

  if (data.platform === "TIKTOK") {
    const tiktokBrandAnalytics = filterTikTokBrandsByScope(
      data.tiktokBrandAnalytics,
      scope,
    );
    const allowedBrandIds = new Set(
      tiktokBrandAnalytics.map((brand) => brand.brandId),
    );

    return {
      ...data,
      tiktokBrandAnalytics,
      accounts: data.accounts.filter((account) =>
        allowedBrandIds.has(Number(account.id)),
      ),
      contentPerformance: tiktokBrandAnalytics.flatMap(
        (brand) => brand.contentPerformance,
      ),
      overviewKpis: tiktokBrandAnalytics[0]?.overviewKpis ?? [],
      engagementKpis: tiktokBrandAnalytics[0]?.engagementKpis ?? [],
      connection: {
        ...data.connection,
        connectedAccountsCount: tiktokBrandAnalytics.filter(
          (brand) => brand.connectionStatus === "Connected",
        ).length,
        lastSyncAt:
          tiktokBrandAnalytics
            .map((brand) => brand.lastSyncAt)
            .filter(Boolean)
            .sort()
            .reverse()[0] ?? null,
        statusRows: tiktokBrandAnalytics[0]?.statusRows ?? data.connection.statusRows,
      },
    };
  }

  if (data.platform !== "META") {
    return {
      ...data,
      ...buildEmptyNonMetaSlice(data.platform),
    };
  }

  const metaBusinessPages = filterMetaBusinessPagesByScope(
    data.metaBusinessPages,
    scope,
  );
  const allowedPageIds = new Set(
    metaBusinessPages
      .map((page) => page.facebookPageId)
      .filter((pageId): pageId is string => Boolean(pageId)),
  );

  return {
    ...data,
    metaBusinessPages,
    accounts: data.accounts.filter((account) =>
      allowedPageIds.has(account.externalAccountId),
    ),
    syncHistory: data.syncHistory.filter(
      (row) =>
        !row.accountId || isFacebookPageIdAllowed(row.accountId, scope),
    ),
    connection: {
      ...data.connection,
      connectedAccountsCount: metaBusinessPages.filter(
        (page) => page.connectionStatus === "Connected",
      ).length,
      statusRows: data.connection.statusRows.map((row) =>
        row.label === "Configured Facebook pages"
          ? { ...row, ok: metaBusinessPages.length > 0, detail: String(metaBusinessPages.length) }
          : row,
      ),
    },
  };
}
