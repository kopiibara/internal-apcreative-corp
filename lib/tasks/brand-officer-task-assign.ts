import "server-only";

import {
  getEffectiveBrandAccessForProfile,
  profileHasAllBrandsAccess,
} from "@/lib/brand-access/effective-brand-access";
import { ALL_BRAND_SLUG } from "@/lib/dashboard/employee-dashboard-brands";
import { query } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { AssignableProfile, AssigneeBrandAccess } from "@/lib/tasks/tasks";

const BRAND_OFFICER_ROLE_SLUG = "brand-officer";
const BRAND_OFFICER_ASSIGNABLE_ROLE_SLUGS = [
  "employee",
  "multimedia",
  "content-creator",
] as const;

type AssignableProfileRow = {
  id: number;
  full_name: string;
  email: string;
  image_url: string | null;
  account_type: AssignableProfile["accountType"];
  status: AssignableProfile["status"];
  brands: AssigneeBrandAccess[] | null;
};

export async function profileHasBrandOfficerRole(profileId: number) {
  const result = await query<{ has_role: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM user_brand_access uba
      JOIN role r ON r.id = uba.role_id
      JOIN brand b ON b.id = uba.brand_id
      WHERE uba.profile_id = $1
        AND uba.is_active = true
        AND b.is_active = true
        AND r.slug = $2
    ) AS has_role
    `,
    [profileId, BRAND_OFFICER_ROLE_SLUG],
  );

  return Boolean(result.rows[0]?.has_role);
}

/** Brand Officers who assign graded tasks may review assignments they created. */
export async function canBrandOfficerReviewAssignedTasks(
  authUserId: string,
  profileId: number,
) {
  if (!(await profileHasBrandOfficerRole(profileId))) {
    return false;
  }

  return can(authUserId, "tasks.assign");
}

export async function getBrandOfficerAssignableProfiles(
  brandOfficerProfileId: number,
): Promise<AssignableProfile[]> {
  const result = await query<AssignableProfileRow>(
    `
    SELECT
      p.id,
      p.full_name,
      p.email,
      u.image AS image_url,
      p.account_type,
      p.status,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'brandId', assignee_brand.id,
            'brandName', assignee_brand.name,
            'isPrimary', assignee_uba.is_primary
          )
        ) FILTER (WHERE assignee_brand.id IS NOT NULL AND assignee_brand.slug <> $2),
        '[]'::json
      ) AS brands
    FROM profile p
    JOIN "user" u ON u.id = p.auth_user_id
    JOIN user_brand_access assignee_uba
      ON assignee_uba.profile_id = p.id
      AND assignee_uba.is_active = true
    JOIN role assignee_role ON assignee_role.id = assignee_uba.role_id
    JOIN brand assignee_brand
      ON assignee_brand.id = assignee_uba.brand_id
      AND assignee_brand.is_active = true
    WHERE p.status = 'ACTIVE'
      AND p.account_type IN ('CLIENT', 'EMPLOYEE')
      AND p.id <> $1
      AND (
        assignee_role.slug = ANY($3::text[])
        OR (
          p.account_type = 'EMPLOYEE'
          AND assignee_role.slug <> 'brand-officer'
        )
      )
      AND (
        EXISTS (
          SELECT 1
          FROM user_brand_access officer_uba
          JOIN role officer_role ON officer_role.id = officer_uba.role_id
          JOIN brand officer_brand
            ON officer_brand.id = officer_uba.brand_id
            AND officer_brand.is_active = true
            AND officer_brand.slug <> $2
          WHERE officer_uba.profile_id = $1
            AND officer_uba.is_active = true
            AND officer_uba.brand_id = assignee_uba.brand_id
            AND officer_role.slug = $4
        )
        OR (
          assignee_role.slug = 'multimedia'
          AND assignee_brand.slug = $2
        )
        OR EXISTS (
          SELECT 1
          FROM user_brand_access officer_uba
          JOIN role officer_role ON officer_role.id = officer_uba.role_id
          JOIN brand officer_brand
            ON officer_brand.id = officer_uba.brand_id
            AND officer_brand.is_active = true
            AND officer_brand.slug = $2
          WHERE officer_uba.profile_id = $1
            AND officer_uba.is_active = true
            AND officer_role.slug = $4
        )
      )
    GROUP BY p.id, p.full_name, p.email, u.image, p.account_type, p.status
    ORDER BY p.full_name ASC, p.id ASC
    `,
    [
      brandOfficerProfileId,
      ALL_BRAND_SLUG,
      BRAND_OFFICER_ASSIGNABLE_ROLE_SLUGS,
      BRAND_OFFICER_ROLE_SLUG,
    ],
  );

  return Promise.all(
    result.rows.map(async (row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      imageUrl: row.image_url,
      accountType: row.account_type,
      status: row.status,
      hasAllBrandsAccess: await profileHasAllBrandsAccess(row.id),
      brands: (await getEffectiveBrandAccessForProfile(row.id)).map((brand) => ({
        brandId: brand.brandId,
        brandName: brand.brandName,
        isPrimary: brand.isPrimary,
      })),
    })),
  );
}

export async function assertBrandOfficerCanAssignToProfiles(
  brandOfficerProfileId: number,
  assigneeProfileIds: number[],
) {
  const allowedProfiles = await getBrandOfficerAssignableProfiles(
    brandOfficerProfileId,
  );
  const allowedIds = new Set(allowedProfiles.map((profile) => profile.id));
  const invalidIds = assigneeProfileIds.filter((id) => !allowedIds.has(id));

  if (invalidIds.length > 0) {
    return {
      ok: false as const,
      message:
        "You can only assign tasks to Employee, Multimedia, or Content Creator accounts on your shared brands.",
    };
  }

  return { ok: true as const };
}
