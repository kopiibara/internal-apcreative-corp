import type { AccountType } from "@/lib/auth/account-type";

export const FORMS_ALLOWED_ACCOUNT_TYPES = [
  "EXECUTIVE",
  "DIRECTOR",
  "MANAGER",
  "SUPERVISOR",
] as const satisfies readonly AccountType[];

export function canAccessFormsPage(accountType: AccountType) {
  return (FORMS_ALLOWED_ACCOUNT_TYPES as readonly AccountType[]).includes(
    accountType,
  );
}
