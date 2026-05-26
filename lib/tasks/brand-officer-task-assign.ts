import "server-only";

import { ALL_BRAND_SLUG } from "@/lib/dashboard/employee-dashboard-brands";
import { query } from "@/lib/db";
import type { AssignableProfile, AssigneeBrandAccess } from "@/lib/tasks/tasks";

const BRAND_OFFICER_ROLE_SLUG = "brand-officer";
const BRAND_OFFICER_ASSIGNABLE_ROLE_SLUGS = [
  "multimedia",
  "content-creator",
] as const;

type AssignableProfileRow = {
  id: number;
  full_name: string;
  email: string;
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
        AND b.slug <> $2
        AND r.slug = $3
    ) AS has_role
    `,
    [profileId, ALL_BRAND_SLUG, BRAND_OFFICER_ROLE_SLUG],
  );

  return Boolean(result.rows[0]?.has_role);
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
      p.account_type,
      p.status,
      COALESCE(
        json_agg(
          json_build_object(
            'brandId', b.id,
            'brandName', b.name,
            'isPrimary', uba.is_primary
          )
          ORDER BY uba.is_primary DESC, b.name ASC
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
      ) AS brands
    FROM profile p
    JOIN user_brand_access uba ON uba.profile_id = p.id AND uba.is_active = true
    JOIN role assignee_role ON assignee_role.id = uba.role_id
    JOIN brand b ON b.id = uba.brand_id AND b.is_active = true
    WHERE p.status = 'ACTIVE'
      AND p.account_type IN ('CLIENT', 'EMPLOYEE')
      AND p.id <> $1
      AND b.slug <> $2
      AND assignee_role.slug = ANY($3::text[])
      AND EXISTS (
        SELECT 1
        FROM user_brand_access officer_uba
        JOIN role officer_role ON officer_role.id = officer_uba.role_id
        WHERE officer_uba.profile_id = $1
          AND officer_uba.is_active = true
          AND officer_uba.brand_id = uba.brand_id
          AND officer_role.slug = $4
      )
    GROUP BY p.id
    ORDER BY p.full_name ASC, p.id ASC
    `,
    [
      brandOfficerProfileId,
      ALL_BRAND_SLUG,
      BRAND_OFFICER_ASSIGNABLE_ROLE_SLUGS,
      BRAND_OFFICER_ROLE_SLUG,
    ],
  );

  return result.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    accountType: row.account_type,
    status: row.status,
    brands: row.brands ?? [],
  }));
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
        "You can only assign tasks to Multimedia or Content Creator accounts on your shared brands.",
    };
  }

  return { ok: true as const };
}
