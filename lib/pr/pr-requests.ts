import "server-only";

import type { AccountType } from "@/lib/auth/account-type";
import type {
  PRCollaborationStatus,
  PRContactStatus,
  PRInfluencerSize,
  PRRequestStatus,
  PRRequestType,
} from "@/lib/pr/pr-constants";
import type { PRRequestRecord } from "@/lib/pr/pr-types";
import { query } from "@/lib/db";

export type { PRRequestRecord } from "@/lib/pr/pr-types";
export { calculatePRRequestMetrics, type PRRequestMetrics } from "@/lib/pr/pr-types";

export type PRRequesterOption = {
  id: number;
  fullName: string;
  accountType: AccountType;
  roleSlugs: string[];
};

type PRRequestRow = {
  id: number;
  brand_id: number;
  brand_name: string;
  request_type: PRRequestType;
  influencer_size: PRInfluencerSize | null;
  recommendation: string;
  initial_details: string | null;
  requested_by_profile_id: number;
  requested_by_name: string;
  contact_status: PRContactStatus;
  date_of_visit: Date | null;
  collaboration_status: PRCollaborationStatus;
  follow_up_notes: string | null;
  declined_reason: string | null;
  status: PRRequestStatus;
  created_by_profile_id: number;
  created_at: Date;
  updated_at: Date;
};

const PR_REQUEST_SELECT = `
  SELECT
    pr.id,
    pr.brand_id,
    b.name AS brand_name,
    pr.request_type,
    pr.influencer_size,
    pr.recommendation,
    pr.initial_details,
    pr.requested_by_profile_id,
    COALESCE(pr.requested_by_name_snapshot, p.full_name) AS requested_by_name,
    pr.contact_status,
    pr.date_of_visit,
    pr.collaboration_status,
    pr.follow_up_notes,
    pr.declined_reason,
    pr.status,
    pr.created_by_profile_id,
    pr.created_at,
    pr.updated_at
  FROM pr_request pr
  JOIN brand b ON b.id = pr.brand_id
  JOIN profile p ON p.id = pr.requested_by_profile_id
`;

function mapPRRequestRow(row: PRRequestRow): PRRequestRecord {
  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: row.brand_name,
    requestType: row.request_type,
    influencerSize: row.influencer_size,
    recommendation: row.recommendation,
    initialDetails: row.initial_details,
    requestedByProfileId: row.requested_by_profile_id,
    requestedByName: row.requested_by_name,
    contactStatus: row.contact_status,
    dateOfVisit: row.date_of_visit
      ? row.date_of_visit.toISOString().slice(0, 10)
      : null,
    collaborationStatus: row.collaboration_status,
    followUpNotes: row.follow_up_notes,
    declinedReason: row.declined_reason,
    status: row.status,
    createdByProfileId: row.created_by_profile_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getActivePRBrands() {
  const result = await query<{ id: number; name: string; slug: string }>(
    `
    SELECT id, name, slug
    FROM brand
    WHERE is_active = true
      AND slug NOT IN ('all-brand')
    ORDER BY name ASC
    `,
  );

  return result.rows;
}

export async function getPRRequesterOptions() {
  const result = await query<{
    id: number;
    full_name: string;
    account_type: AccountType;
    role_slugs: string[] | null;
  }>(
    `
    SELECT
      p.id,
      p.full_name,
      p.account_type,
      COALESCE(
        array_agg(DISTINCT r.slug) FILTER (WHERE r.slug IS NOT NULL),
        ARRAY[]::text[]
      ) AS role_slugs
    FROM profile p
    LEFT JOIN user_brand_access uba
      ON uba.profile_id = p.id
      AND uba.is_active = true
    LEFT JOIN role r ON r.id = uba.role_id
    WHERE p.status = 'ACTIVE'
      AND (
        p.account_type IN ('EXECUTIVE', 'DIRECTOR', 'MANAGER', 'SUPERVISOR', 'PR')
        OR r.slug = 'pr'
      )
    GROUP BY p.id
    ORDER BY
      CASE p.account_type
        WHEN 'EXECUTIVE' THEN 1
        WHEN 'DIRECTOR' THEN 2
        WHEN 'MANAGER' THEN 3
        WHEN 'SUPERVISOR' THEN 4
        WHEN 'PR' THEN 5
        ELSE 5
      END,
      p.full_name ASC,
      p.id ASC
    `,
  );

  return result.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    accountType: row.account_type,
    roleSlugs: row.role_slugs ?? [],
  }));
}

export async function getPRRequesterOptionById(profileId: number) {
  const result = await query<{
    id: number;
    full_name: string;
    account_type: AccountType;
    role_slugs: string[] | null;
  }>(
    `
    SELECT
      p.id,
      p.full_name,
      p.account_type,
      COALESCE(
        array_agg(DISTINCT r.slug) FILTER (WHERE r.slug IS NOT NULL),
        ARRAY[]::text[]
      ) AS role_slugs
    FROM profile p
    LEFT JOIN user_brand_access uba
      ON uba.profile_id = p.id
      AND uba.is_active = true
    LEFT JOIN role r ON r.id = uba.role_id
    WHERE p.id = $1
      AND p.status = 'ACTIVE'
    GROUP BY p.id
    HAVING
      p.account_type IN ('EXECUTIVE', 'DIRECTOR', 'MANAGER', 'SUPERVISOR', 'PR')
      OR bool_or(r.slug = 'pr')
    LIMIT 1
    `,
    [profileId],
  );

  const row = result.rows[0];

  return row
    ? {
        id: row.id,
        fullName: row.full_name,
        accountType: row.account_type,
        roleSlugs: row.role_slugs ?? [],
      }
    : null;
}

export async function profileHasBrandAccess(profileId: number, brandId: number) {
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
    ) AS has_access
    `,
    [profileId, brandId],
  );

  return Boolean(result.rows[0]?.has_access);
}

export async function getPRRequestsForViewer(options: {
  profileId: number;
  accountType: AccountType;
  canViewAll: boolean;
}) {
  const scopedFilter = options.canViewAll
    ? ""
    : `
      AND EXISTS (
        SELECT 1
        FROM user_brand_access uba
        WHERE uba.profile_id = $1
          AND uba.brand_id = pr.brand_id
          AND uba.is_active = true
      )
    `;

  const result = await query<PRRequestRow>(
    `
    ${PR_REQUEST_SELECT}
    WHERE b.is_active = true
      AND pr.status = 'ACTIVE'
    ${scopedFilter}
    ORDER BY pr.created_at DESC, pr.id DESC
    `,
    options.canViewAll ? [] : [options.profileId],
  );

  return result.rows.map(mapPRRequestRow);
}

export async function getPRRequestById(requestId: number) {
  const result = await query<PRRequestRow>(
    `
    ${PR_REQUEST_SELECT}
    WHERE pr.id = $1
    LIMIT 1
    `,
    [requestId],
  );

  const row = result.rows[0];

  return row ? mapPRRequestRow(row) : null;
}
