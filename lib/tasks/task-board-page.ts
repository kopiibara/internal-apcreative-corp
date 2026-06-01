import "server-only";

import type { TaskPermissionFlags } from "@/components/to-do/types";
import {
  isEmployeeAccountType,
  type AccountType,
} from "@/lib/auth/account-type";
import { can, requirePermission } from "@/lib/permissions";
import {
  getBrandOfficerAssignableProfiles,
  profileHasBrandOfficerRole,
} from "@/lib/tasks/brand-officer-task-assign";
import {
  getAssignableProfilesWithBrands,
  getTaskAssignmentsForEmployee,
  getTaskAssignmentsForViewer,
} from "@/lib/tasks/tasks";

async function loadTaskPermissions(
  authUserId: string,
  accountType: AccountType,
) {
  const [
    canCreate,
    canAssign,
    canUpdate,
    canDelete,
    canViewAllPermission,
    canManageAll,
    canSubmitProof,
    canReview,
  ] = await Promise.all([
    can(authUserId, "tasks.create"),
    can(authUserId, "tasks.assign"),
    can(authUserId, "tasks.update"),
    can(authUserId, "tasks.delete"),
    can(authUserId, "tasks.view_all"),
    can(authUserId, "tasks.manage_all"),
    can(authUserId, "tasks.submit_proof"),
    can(authUserId, "tasks.review"),
  ]);

  if (accountType === "FULL_STACK_DEVELOPER") {
    return {
      canCreate: false,
      canAssign: false,
      canUpdate: false,
      canDelete: false,
      canViewAll: canViewAllPermission,
      canManageAll: false,
      canSubmitProof,
      canReportBlocker: canSubmitProof,
      canReview: false,
      isEmployee: false,
    } satisfies TaskPermissionFlags;
  }

  const permissions: TaskPermissionFlags = {
    canCreate,
    canAssign,
    canUpdate,
    canDelete,
    canViewAll: canViewAllPermission,
    canManageAll,
    canSubmitProof,
    canReportBlocker: canSubmitProof,
    canReview,
    isEmployee: isEmployeeAccountType(accountType),
  };

  return permissions;
}

export async function loadAdminTaskBoardPage() {
  const context = await requirePermission("tasks.view");
  const authUserId = context.profile.auth_user_id;
  const isFullStackDeveloper =
    context.profile.account_type === "FULL_STACK_DEVELOPER";
  const canViewAll =
    !isFullStackDeveloper && (await can(authUserId, "tasks.view_all"));

  const [assignments, assignees, permissions] = await Promise.all([
    getTaskAssignmentsForViewer({
      profileId: context.profile.id,
      canViewAll,
    }),
    getAssignableProfilesWithBrands({
      viewerProfileId: context.profile.id,
      viewerAccountType: context.profile.account_type,
    }),
    loadTaskPermissions(authUserId, context.profile.account_type),
  ]);

  return {
    variant: "admin" as const,
    assignments,
    assignees,
    currentProfileId: context.profile.id,
    currentAccountType: context.profile.account_type,
    permissions,
  };
}

export type EmployeeTaskBoardPageData = {
  variant: "employee";
  assignments: Awaited<ReturnType<typeof getTaskAssignmentsForEmployee>>;
  assignees: Awaited<ReturnType<typeof getBrandOfficerAssignableProfiles>>;
  currentProfileId: number;
  currentAccountType: AccountType;
  permissions: TaskPermissionFlags;
};

export async function loadEmployeeTaskBoardPageData(profile: {
  id: number;
  auth_user_id: string;
  account_type: AccountType;
}): Promise<EmployeeTaskBoardPageData> {
  const authUserId = profile.auth_user_id;

  const [assignments, permissions, isBrandOfficer, canAssignTeamTasks] =
    await Promise.all([
      getTaskAssignmentsForEmployee(profile.id),
      loadTaskPermissions(authUserId, profile.account_type),
      profileHasBrandOfficerRole(profile.id),
      can(authUserId, "tasks.assign"),
    ]);

  const canAssignBrandTeamTasks = isBrandOfficer && canAssignTeamTasks;
  const assignees = canAssignBrandTeamTasks
    ? await getBrandOfficerAssignableProfiles(profile.id)
    : [];

  return {
    variant: "employee",
    assignments,
    assignees,
    currentProfileId: profile.id,
    currentAccountType: profile.account_type,
    permissions: {
      ...permissions,
      canAssign: canAssignBrandTeamTasks,
      canReview: canAssignBrandTeamTasks,
      canViewAll: false,
      canManageAll: false,
      canDelete: false,
      canUpdate: canAssignBrandTeamTasks && permissions.canUpdate,
      isEmployee: true,
      canCreate: canAssignBrandTeamTasks,
      canSubmitProof: permissions.canSubmitProof,
      canReportBlocker: permissions.canReportBlocker,
    },
  };
}

/** @deprecated Use loadAdminTaskBoardPage or loadEmployeeTaskBoardPageData */
export async function loadEmployeeTaskBoardPage() {
  const context = await requirePermission("tasks.view");
  return loadEmployeeTaskBoardPageData(context.profile);
}

/** @deprecated Use loadAdminTaskBoardPage or loadEmployeeTaskBoardPage */
export async function loadTaskBoardPage() {
  const context = await requirePermission("tasks.view");

  if (isEmployeeAccountType(context.profile.account_type)) {
    return loadEmployeeTaskBoardPageData(context.profile);
  }

  return loadAdminTaskBoardPage();
}
