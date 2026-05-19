import { redirect } from "next/navigation"

import {
  getCurrentProfileContext,
  isAdminAccountType,
  isEmployeeAccountType,
} from "@/lib/auth-session"

export default async function HomePage() {
  const context = await getCurrentProfileContext()

  if (!context) {
    redirect("/login")
  }

  if (context.profile.status !== "ACTIVE") {
    redirect("/login")
  }

  if (isAdminAccountType(context.profile.account_type)) {
    redirect("/admin/dashboard")
  }

  if (isEmployeeAccountType(context.profile.account_type)) {
    redirect("/employee/dashboard")
  }

  redirect("/login")
}