import "server-only";

import {
  getEffectiveBrandAccessForProfile,
  profileHasAllBrandsAccess,
} from "@/lib/brand-access/effective-brand-access";
import { query } from "@/lib/db";
import type { MetaBusinessPageDashboard } from "@/lib/meta/page-analytics";
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
};

export type PlatformAnalyticsBrandScopeUi = {
  hasAllBrandsAccess: boolean;
  defaultMetaPageKey: string;
  showAllPagesOption: boolean;
};

function normalizeBrandSlug(slug: string) {
  return slug.trim().toLowerCase().replace(/[_\s]+/g, "-");
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
  if (await profileHasAllBrandsAccess(profileId)) {
    return {
      hasAllBrandsAccess: true,
      allowedBrandSlugs: [],
      allowedBrandIds: [],
    };
  }

  const effectiveBrands = await getEffectiveBrandAccessForProfile(profileId);

  if (effectiveBrands.length === 0) {
    return {
      hasAllBrandsAccess: false,
      allowedBrandSlugs: [],
      allowedBrandIds: [],
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

  return (
    slugMatchesAllowedBrand(
      config.brandSlug,
      scope.allowedBrandSlugs,
      scope.allowedBrandIds,
    ) ||
    slugMatchesAllowedBrand(
      pageKey,
      scope.allowedBrandSlugs,
      scope.allowedBrandIds,
    ) ||
    slugMatchesAllowedBrand(
      config.displayName,
      scope.allowedBrandSlugs,
      scope.allowedBrandIds,
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

export function filterMetaBusinessPagesByScope(
  pages: MetaBusinessPageDashboard[],
  scope: PlatformAnalyticsBrandScope,
): MetaBusinessPageDashboard[] {
  if (scope.hasAllBrandsAccess) {
    return pages;
  }

  return pages.filter((page) => isMetaPageKeyAllowed(page.key, scope));
}

export function toPlatformAnalyticsBrandScopeUi(
  scope: PlatformAnalyticsBrandScope,
  allowedPages: MetaBusinessPageDashboard[],
): PlatformAnalyticsBrandScopeUi {
  if (scope.hasAllBrandsAccess) {
    return {
      hasAllBrandsAccess: true,
      defaultMetaPageKey: "all",
      showAllPagesOption: true,
    };
  }

  if (allowedPages.length <= 1) {
    return {
      hasAllBrandsAccess: false,
      defaultMetaPageKey: allowedPages[0]?.key ?? "all",
      showAllPagesOption: false,
    };
  }

  return {
    hasAllBrandsAccess: false,
    defaultMetaPageKey: allowedPages[0]?.key ?? "all",
    showAllPagesOption: false,
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
  };
}

export function applyBrandScopeToDashboardData(
  data: PlatformAnalyticsDashboardData,
  scope: PlatformAnalyticsBrandScope,
): PlatformAnalyticsDashboardData {
  if (scope.hasAllBrandsAccess) {
    return data;
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
