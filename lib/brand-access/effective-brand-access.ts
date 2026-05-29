import "server-only";

import {
  hasOrganizationWideBrandAccess,
  type AccountType,
} from "@/lib/auth/account-type";
import { ALL_BRAND_SLUG } from "@/lib/dashboard/employee-dashboard-brands";
import { query } from "@/lib/db";

export type EffectiveBrandAccess = {
  brandId: number;
  brandName: string;
  isPrimary: boolean;
};

type BrandAssignmentRow = {
  brand_id: number;
  brand_name: string;
  brand_slug: string;
  is_primary: boolean;
};

type ProfileBrandScopeRow = {
  account_type: AccountType;
  has_all_brand_assignment: boolean;
};

export async function getActiveRealBrands(): Promise<EffectiveBrandAccess[]> {
  const result = await query<{
    id: number;
    name: string;
  }>(
    `
    SELECT id, name
    FROM brand
    WHERE is_active = true
      AND slug <> $1
    ORDER BY name ASC, id ASC
    `,
    [ALL_BRAND_SLUG],
  );

  return result.rows.map((row) => ({
    brandId: row.id,
    brandName: row.name,
    isPrimary: false,
  }));
}

async function getProfileBrandScope(profileId: number) {
  const result = await query<ProfileBrandScopeRow>(
    `
    SELECT
      p.account_type,
      EXISTS (
        SELECT 1
        FROM user_brand_access uba
        JOIN brand b ON b.id = uba.brand_id
        WHERE uba.profile_id = p.id
          AND uba.is_active = true
          AND b.is_active = true
          AND b.slug = $2
      ) AS has_all_brand_assignment
    FROM profile p
    WHERE p.id = $1
    LIMIT 1
    `,
    [profileId, ALL_BRAND_SLUG],
  );

  return result.rows[0] ?? null;
}

/** True when the account has every active brand (org-wide type or All Brand assignment). */
export async function profileHasAllBrandsAccess(profileId: number) {
  const scope = await getProfileBrandScope(profileId);

  if (!scope) {
    return false;
  }

  return (
    hasOrganizationWideBrandAccess(scope.account_type) ||
    scope.has_all_brand_assignment
  );
}

async function getProfileBrandAssignments(profileId: number) {
  const result = await query<BrandAssignmentRow>(
    `
    SELECT
      b.id AS brand_id,
      b.name AS brand_name,
      b.slug AS brand_slug,
      uba.is_primary
    FROM user_brand_access uba
    JOIN brand b ON b.id = uba.brand_id
    WHERE uba.profile_id = $1
      AND uba.is_active = true
      AND b.is_active = true
    ORDER BY uba.is_primary DESC, b.name ASC, b.id ASC
    `,
    [profileId],
  );

  return result.rows;
}

async function mapAllRealBrandsForProfile(profileId: number) {
  const assignments = await getProfileBrandAssignments(profileId);
  const allBrandAssignment = assignments.find(
    (row) => row.brand_slug === ALL_BRAND_SLUG,
  );
  const primaryRealBrand = assignments.find(
    (row) => row.is_primary && row.brand_slug !== ALL_BRAND_SLUG,
  );
  const realBrands = await getActiveRealBrands();

  return realBrands.map((brand) => ({
    ...brand,
    isPrimary:
      primaryRealBrand?.brand_id === brand.brandId ||
      Boolean(allBrandAssignment?.is_primary && !primaryRealBrand),
  }));
}

/** Brand options for forms/filters: org-wide and All Brand expand to every active real brand. */
export async function getEffectiveBrandAccessForProfile(
  profileId: number,
): Promise<EffectiveBrandAccess[]> {
  if (await profileHasAllBrandsAccess(profileId)) {
    return mapAllRealBrandsForProfile(profileId);
  }

  const assignments = await getProfileBrandAssignments(profileId);

  if (assignments.length === 0) {
    return [];
  }

  return assignments
    .filter((row) => row.brand_slug !== ALL_BRAND_SLUG)
    .map((row) => ({
      brandId: row.brand_id,
      brandName: row.brand_name,
      isPrimary: row.is_primary,
    }));
}

/** True when the profile has at least one effective real-brand assignment. */
export async function profileHasAssignedBrandAccess(profileId: number) {
  const brands = await getEffectiveBrandAccessForProfile(profileId);
  return brands.length > 0;
}

export async function profileHasAccessToBrand(
  profileId: number,
  brandId: number,
) {
  if (await profileHasAllBrandsAccess(profileId)) {
    const realBrands = await getActiveRealBrands();
    return realBrands.some((brand) => brand.brandId === brandId);
  }

  const result = await query<{ has_access: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM user_brand_access uba
      JOIN brand b ON b.id = uba.brand_id
      WHERE uba.profile_id = $1
        AND uba.brand_id = $2
        AND uba.is_active = true
        AND b.is_active = true
        AND b.slug <> $3
    ) AS has_access
    `,
    [profileId, brandId, ALL_BRAND_SLUG],
  );

  return Boolean(result.rows[0]?.has_access);
}

export async function profilesShareBrandAccess(
  profileIdA: number,
  profileIdB: number,
) {
  if (profileIdA === profileIdB) {
    return true;
  }

  const [hasAllA, hasAllB] = await Promise.all([
    profileHasAllBrandsAccess(profileIdA),
    profileHasAllBrandsAccess(profileIdB),
  ]);

  if (hasAllA || hasAllB) {
    return true;
  }

  const result = await query<{ shares_access: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM user_brand_access uba_a
      JOIN user_brand_access uba_b
        ON uba_b.profile_id = $2
       AND uba_b.is_active = true
       AND uba_b.brand_id = uba_a.brand_id
      JOIN brand b
        ON b.id = uba_a.brand_id
       AND b.is_active = true
       AND b.slug <> $3
      WHERE uba_a.profile_id = $1
        AND uba_a.is_active = true
    ) AS shares_access
    `,
    [profileIdA, profileIdB, ALL_BRAND_SLUG],
  );

  return Boolean(result.rows[0]?.shares_access);
}

export async function isActiveFullStackDeveloper(profileId: number) {
  const result = await query<{ is_full_stack: boolean }>(
    `
    SELECT
      p.account_type = 'FULL_STACK_DEVELOPER'
      AND EXISTS (
        SELECT 1
        FROM user_brand_access assignee_access
        JOIN role assignee_role ON assignee_role.id = assignee_access.role_id
        WHERE assignee_access.profile_id = p.id
          AND assignee_access.is_active = true
          AND assignee_role.slug = 'full-stack-developer'
      ) AS is_full_stack
    FROM profile p
    WHERE p.id = $1
      AND p.status = 'ACTIVE'
    LIMIT 1
    `,
    [profileId],
  );

  return Boolean(result.rows[0]?.is_full_stack);
}
