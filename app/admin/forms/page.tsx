import { redirect } from "next/navigation";

import { FormsDashboard } from "@/components/admin/forms/forms-dashboard";
import { requireAdmin } from "@/lib/auth/auth-session";
import { canAccessFormsPage } from "@/lib/forms/forms-access";
import { getFormSubmissions } from "@/lib/forms/forms";

export const metadata = {
  title: "Forms",
};

export default async function FormsPage() {
  const { profile } = await requireAdmin();

  if (!canAccessFormsPage(profile.account_type)) {
    redirect("/admin/unauthorized?permission=forms.view");
  }

  const submissions = await getFormSubmissions();

  return <FormsDashboard submissions={submissions} />;
}
