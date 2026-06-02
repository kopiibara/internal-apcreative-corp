import "server-only";

import {
  isEmployeeAccountType,
  type AccountType,
} from "@/lib/auth/account-type";
import { profileHasBrandOfficerRole } from "@/lib/tasks/brand-officer-task-assign";
import { query } from "@/lib/db";
import { can } from "@/lib/permissions";

/** Brand Officers with tasks.assign — graded team tasks only (no personal to-dos). */
export async function canUseEmployeeToDoTasks(
  authUserId: string,
  profileId: number,
) {
  if (!(await profileHasBrandOfficerRole(profileId))) {
    return false;
  }

  return can(authUserId, "tasks.assign");
}

export async function employeeHasAssignedTasks(profileId: number) {
  const result = await query<{ has_tasks: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM task_assignment
      WHERE assigned_to_profile_id = $1
    ) AS has_tasks
    `,
    [profileId],
  );

  return Boolean(result.rows[0]?.has_tasks);
}

/** To-Do Task board: Brand Officers who assign, or assignees with existing tasks. */
export async function canAccessEmployeeToDoTaskBoard(
  authUserId: string,
  profileId: number,
) {
  if (await canAccessEmployeeTaskPage(authUserId, "EMPLOYEE", profileId)) {
    return true;
  }

  if (await canUseEmployeeToDoTasks(authUserId, profileId)) {
    return true;
  }

  return employeeHasAssignedTasks(profileId);
}

export async function canAccessEmployeeTaskPage(
  authUserId: string,
  accountType: AccountType,
  profileId: number,
) {
  if (!isEmployeeAccountType(accountType)) {
    return false;
  }

  if (await can(authUserId, "tasks.view")) {
    return true;
  }

  const brandAccess = await query<{ has_access: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM user_brand_access
      WHERE profile_id = $1
        AND is_active = true
    ) AS has_access
    `,
    [profileId],
  );

  return Boolean(brandAccess.rows[0]?.has_access);
}
