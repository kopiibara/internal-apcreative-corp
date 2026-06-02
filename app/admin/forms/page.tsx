import { redirect } from "next/navigation";

import { FormsDashboard } from "@/components/admin/forms/forms-dashboard";
import { requireAdmin } from "@/lib/auth/auth-session";
import type { AccountType } from "@/lib/auth/account-type";
import { getFormSubmissions } from "@/lib/forms/forms";

const ALLOWED_FORM_ACCOUNT_TYPES = new Set<AccountType>([
  "EXECUTIVE",
  "DIRECTOR",
  "MANAGER",
  "SUPERVISOR",
]);

export const metadata = {
  title: "Forms",
};

export default async function FormsPage() {
  const { profile } = await requireAdmin();

  if (!ALLOWED_FORM_ACCOUNT_TYPES.has(profile.account_type)) {
    redirect("/admin/unauthorized?permission=forms.view");
  }

  const submissions = await getFormSubmissions();

  return <FormsDashboard submissions={submissions} />;
}
