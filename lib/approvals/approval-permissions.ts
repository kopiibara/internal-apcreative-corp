import "server-only";

import {
  isActiveFullStackDeveloper,
  profileHasAccessToBrand,
  profileHasAllBrandsAccess,
} from "@/lib/brand-access/effective-brand-access";
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
const MULTIMEDIA_ROLE_SLUG = "multimedia";
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
  publishingProofNote?: string | null;
}) {
  return (
    report.publishStatus !== "Published" ||
    Boolean(report.publishingProofUrl?.trim() || report.publishingProofNote?.trim())
  );
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

  const hasAllBrandsOfficer = await query<{ has_access: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM user_brand_access uba
      JOIN role r ON r.id = uba.role_id
      JOIN brand b ON b.id = uba.brand_id
      WHERE uba.profile_id = $1
        AND uba.is_active = true
        AND b.is_active = true
        AND b.slug = $2
        AND r.slug = $3
    ) AS has_access
    `,
    [profileId, ALL_BRAND_SLUG, BRAND_OFFICER_ROLE_SLUG],
  );

  if (hasAllBrandsOfficer.rows[0]?.has_access) {
    return profileHasAccessToBrand(profileId, brandId);
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

export async function profileHasMultimediaRoleForBrand(
  profileId: number,
  brandId: number,
) {
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
        AND r.slug = $3
        AND (uba.brand_id = $2 OR b.slug = $4)
    ) AS has_role
    `,
    [profileId, brandId, MULTIMEDIA_ROLE_SLUG, ALL_BRAND_SLUG],
  );

  return Boolean(result.rows[0]?.has_role);
}

export async function profileHasActiveBrandAssignment(profileId: number) {
  if (await profileHasAllBrandsAccess(profileId)) {
    return true;
  }

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

export async function profileHasApprovalCreatableBrandAssignment(
  profileId: number,
) {
  if (await profileHasAllBrandsAccess(profileId)) {
    const result = await query<{ has_multimedia_scope: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM user_brand_access uba
        JOIN role r ON r.id = uba.role_id
        JOIN brand b ON b.id = uba.brand_id
        WHERE uba.profile_id = $1
          AND uba.is_active = true
          AND b.is_active = true
          AND b.slug = $2
          AND r.slug = $3
      ) AS has_multimedia_scope
      `,
      [profileId, ALL_BRAND_SLUG, MULTIMEDIA_ROLE_SLUG],
    );

    return !result.rows[0]?.has_multimedia_scope;
  }

  const result = await query<{ has_access: boolean }>(
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
        AND r.slug <> $3
    ) AS has_access
    `,
    [profileId, ALL_BRAND_SLUG, MULTIMEDIA_ROLE_SLUG],
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

  return profileHasApprovalCreatableBrandAssignment(actor.id);
}

export async function canUserCreateApprovalForBrand(
  profileId: number,
  brandId: number,
) {
  if (!(await profileHasAccessToBrand(profileId, brandId))) {
    return false;
  }

  return !(await profileHasMultimediaRoleForBrand(profileId, brandId));
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
        ? profileHasAccessToBrand(actor.id, report.brandId)
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

  return isActiveFullStackDeveloper(assigneeProfileId);
}

export async function assertSupervisorCanAssignTasksToUsers(
  supervisor: ApprovalActor,
  assigneeProfileIds: number[],
) {
  if (supervisor.account_type !== "SUPERVISOR") {
    return { ok: true as const };
  }

  for (const assigneeId of assigneeProfileIds) {
    if (assigneeId === supervisor.id) {
      continue;
    }

    const assigneeResult = await query<{ account_type: AccountType }>(
      `
      SELECT account_type
      FROM profile
      WHERE id = $1
        AND status = 'ACTIVE'
      LIMIT 1
      `,
      [assigneeId],
    );
    const assignee = assigneeResult.rows[0];

    if (assignee?.account_type !== "FULL_STACK_DEVELOPER") {
      continue;
    }

    const canAssign = await canSupervisorAssignTaskToUser(
      supervisor,
      assigneeId,
    );

    if (!canAssign) {
      return {
        ok: false as const,
        message:
          "Supervisors can only assign graded tasks to active Full Stack Developer accounts.",
      };
    }
  }

  return { ok: true as const };
}
