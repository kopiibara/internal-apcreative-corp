import type { AccountType } from "@/lib/auth/account-type";

/**
 * Full Stack Developer accounts use the admin dashboard to monitor product
 * updates. They must not perform supervisor-style operations (account control,
 * approval reviews, or task management).
 */
export const FULL_STACK_DEVELOPER_DENIED_PERMISSIONS = new Set([
  "accounts.view",
  "accounts.create",
  "accounts.update",
  "accounts.disable",
  "accounts.delete",
  "approvals.supervisor_review",
  "approvals.director_review",
  "approvals.publish_update",
  "approvals.request_revision",
  "approvals.approve",
  "approvals.reject",
  "tasks.create",
  "tasks.assign",
  "tasks.update",
  "tasks.delete",
  "tasks.review",
  "tasks.manage_all",
  "tasks.complete",
]);

export function isFullStackDeveloperAccountType(
  accountType: AccountType,
): boolean {
  return accountType === "FULL_STACK_DEVELOPER";
}

export function isFullStackDeveloperDeniedPermission(permissionKey: string) {
  return FULL_STACK_DEVELOPER_DENIED_PERMISSIONS.has(permissionKey);
}

export function canFullStackDeveloperUseSensitiveAccountAction(
  accountType: AccountType,
) {
  return !isFullStackDeveloperAccountType(accountType);
}
