import "server-only";

import { ALL_BRAND_SLUG } from "@/lib/dashboard/employee-dashboard-brands";
import { query } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { AccountType } from "@/lib/auth/account-type";
import {
  isAdminAccountType,
  isEmployeeAccountType,
} from "@/lib/auth/account-type";
import type { ContentReport } from "@/types/content-report";

const BRAND_OFFICER_ROLE_SLUG = "brand-officer";
const FULL_STACK_DEVELOPER_ROLE_SLUG = "full-stack-developer";

type ApprovalActor = {
  id: number;
  auth_user_id: string;
  account_type: AccountType;
};

type ApprovalAccessReport = {
  brandId: number | null;
  supervisorStatus: string;
  directorStatus: string;
  publishStatus: string;
  publishingProofUrl?: string | null;
};

export function requirePublishingProofBeforePublished(report: {
  publishStatus?: string;
  publishingProofUrl?: string | null;
}) {
  return report.publishStatus !== "Published" || Boolean(report.publishingProofUrl);
}

export function isApprovalReadyForPublishing(report: {
  supervisorStatus: string;
  directorStatus: string;
}) {
  return (
    report.supervisorStatus === "Approved" &&
    report.directorStatus === "Approved"
  );
}

export async function isBrandOfficerForBrand(
  profileId: number,
  brandId: number | null,
) {
  if (brandId == null) {
    return false;
  }

  const result = await query<{ has_access: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM user_brand_access uba
      JOIN role r ON r.id = uba.role_id
      JOIN brand b ON b.id = uba.brand_id
      WHERE uba.profile_id = $1
        AND uba.brand_id = $2
        AND uba.is_active = true
        AND b.is_active = true
        AND b.slug <> $3
        AND r.slug = $4
    ) AS has_access
    `,
    [profileId, brandId, ALL_BRAND_SLUG, BRAND_OFFICER_ROLE_SLUG],
  );

  return Boolean(result.rows[0]?.has_access);
}

export async function profileHasActiveBrandAssignment(profileId: number) {
  const result = await query<{ has_access: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM user_brand_access uba
      JOIN brand b ON b.id = uba.brand_id
      WHERE uba.profile_id = $1
        AND uba.is_active = true
        AND b.is_active = true
        AND b.slug <> $2
    ) AS has_access
    `,
    [profileId, ALL_BRAND_SLUG],
  );

  return Boolean(result.rows[0]?.has_access);
}

/** Employee-dashboard users create approvals from any active brand assignment. */
export async function canEmployeeCreateContentReport(
  actor: ApprovalActor,
  brandId?: number,
) {
  if (!isEmployeeAccountType(actor.account_type)) {
    return false;
  }

  if (brandId != null) {
    return canUserCreateApprovalForBrand(actor.id, brandId);
  }

  return profileHasActiveBrandAssignment(actor.id);
}

export async function canUserCreateApprovalForBrand(
  profileId: number,
  brandId: number,
) {
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

export async function canUserViewApprovalRequest(
  actor: ApprovalActor,
  report: ApprovalAccessReport & { submittedByProfileId?: number },
) {
  if (isAdminAccountType(actor.account_type)) {
    return can(actor.auth_user_id, "approvals.view", report.brandId ?? undefined);
  }

  if (report.submittedByProfileId === actor.id) {
    if (isEmployeeAccountType(actor.account_type)) {
      return report.brandId != null
        ? canUserCreateApprovalForBrand(actor.id, report.brandId)
        : profileHasActiveBrandAssignment(actor.id);
    }

    return can(actor.auth_user_id, "content_reports.view", report.brandId ?? undefined);
  }

  if (await isBrandOfficerForBrand(actor.id, report.brandId)) {
    return true;
  }

  return false;
}

export async function canUserPublishApprovalRequest(
  actor: ApprovalActor,
  report: ApprovalAccessReport,
) {
  if (!isApprovalReadyForPublishing(report)) {
    return false;
  }

  if (!["Pending", "Scheduled"].includes(report.publishStatus)) {
    return false;
  }

  if (isAdminAccountType(actor.account_type)) {
    return can(actor.auth_user_id, "approvals.publish_update", report.brandId ?? undefined);
  }

  return isBrandOfficerForBrand(actor.id, report.brandId);
}

export async function canUserScheduleApprovalRequest(
  actor: ApprovalActor,
  report: ApprovalAccessReport,
) {
  if (!isApprovalReadyForPublishing(report)) {
    return false;
  }

  if (!["Pending", "Scheduled"].includes(report.publishStatus)) {
    return false;
  }

  if (isAdminAccountType(actor.account_type)) {
    return can(actor.auth_user_id, "approvals.publish_update", report.brandId ?? undefined);
  }

  return isBrandOfficerForBrand(actor.id, report.brandId);
}

export async function decorateApprovalPublishingPermissions(
  actor: ApprovalActor,
  reports: ContentReport[],
): Promise<ContentReport[]> {
  const decorated = await Promise.all(
    reports.map(async (report) => ({
      ...report,
      approvalPublishingPermissions: {
        canPublishNow: await canUserPublishApprovalRequest(actor, report),
        canSchedulePublish: await canUserScheduleApprovalRequest(actor, report),
      },
    })),
  );

  return decorated;
}

export async function canSupervisorAssignTaskToUser(
  supervisor: ApprovalActor,
  assigneeProfileId: number,
) {
  if (supervisor.account_type !== "SUPERVISOR") {
    return false;
  }

  const result = await query<{ can_assign: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM profile assignee
      JOIN user_brand_access assignee_access
        ON assignee_access.profile_id = assignee.id
       AND assignee_access.is_active = true
      JOIN role assignee_role ON assignee_role.id = assignee_access.role_id
      JOIN brand b ON b.id = assignee_access.brand_id AND b.is_active = true
      WHERE assignee.id = $2
        AND assignee.status = 'ACTIVE'
        AND assignee_role.slug = $3
        AND b.slug <> $4
        AND EXISTS (
          SELECT 1
          FROM user_brand_access supervisor_access
          WHERE supervisor_access.profile_id = $1
            AND supervisor_access.brand_id = assignee_access.brand_id
            AND supervisor_access.is_active = true
        )
    ) AS can_assign
    `,
    [
      supervisor.id,
      assigneeProfileId,
      FULL_STACK_DEVELOPER_ROLE_SLUG,
      ALL_BRAND_SLUG,
    ],
  );

  return Boolean(result.rows[0]?.can_assign);
}

export async function assertSupervisorCanAssignTasksToUsers(
  supervisor: ApprovalActor,
  assigneeProfileIds: number[],
) {
  if (supervisor.account_type !== "SUPERVISOR") {
    return { ok: true as const };
  }

  const result = await query<{ invalid_count: number }>(
    `
    SELECT COUNT(*)::int AS invalid_count
    FROM profile assignee
    WHERE assignee.id = ANY($2::integer[])
      AND assignee.account_type = 'FULL_STACK_DEVELOPER'
      AND NOT EXISTS (
        SELECT 1
        FROM user_brand_access assignee_access
        JOIN role assignee_role ON assignee_role.id = assignee_access.role_id
        JOIN brand b ON b.id = assignee_access.brand_id AND b.is_active = true
        WHERE assignee_access.profile_id = assignee.id
          AND assignee_access.is_active = true
          AND assignee_role.slug = $3
          AND b.slug <> $4
          AND EXISTS (
            SELECT 1
            FROM user_brand_access supervisor_access
            WHERE supervisor_access.profile_id = $1
              AND supervisor_access.brand_id = assignee_access.brand_id
              AND supervisor_access.is_active = true
          )
      )
    `,
    [
      supervisor.id,
      assigneeProfileIds.filter((assigneeId) => assigneeId !== supervisor.id),
      FULL_STACK_DEVELOPER_ROLE_SLUG,
      ALL_BRAND_SLUG,
    ],
  );

  if ((result.rows[0]?.invalid_count ?? 0) > 0) {
    return {
      ok: false as const,
      message:
        "Supervisors can only assign tasks to Full Stack Developer users on shared brands.",
    };
  }

  return { ok: true as const };
}
