import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import {
  type AccountType,
  isAdminAccountType,
  isEmployeeAccountType,
} from "@/lib/auth/account-type";
import { query } from "@/lib/db";

export type { AccountType } from "@/lib/auth/account-type";
export {
  isAdminAccountType,
  isEmployeeAccountType,
} from "@/lib/auth/account-type";

export type ProfileStatus =
  | "ACTIVE"
  | "INVITED"
  | "DISABLED"
  | "SUSPENDED"
  | "ARCHIVED";

type ProfileRow = {
  id: number;
  auth_user_id: string;
  account_type: AccountType;
  full_name: string;
  email: string;
  position: string | null;
  department: string | null;
  phone_number: string | null;
  status: ProfileStatus;
  must_change_password: boolean;
  first_login_completed_at: Date | null;
  password_changed_at: Date | null;
};

export async function getCurrentSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function getCurrentProfileContext() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return null;
  }

  const profileResult = await query<ProfileRow>(
    `
    SELECT
      id,
      auth_user_id,
      account_type,
      full_name,
      email,
      position,
      department,
      phone_number,
      status,
      must_change_password,
      first_login_completed_at,
      password_changed_at
    FROM profile
    WHERE auth_user_id = $1
    LIMIT 1
    `,
    [session.user.id],
  );

  const profile = profileResult.rows[0];

  if (!profile) {
    return null;
  }

  return {
    session,
    user: session.user,
    profile,
  };
}

export async function requireAuth() {
  const context = await getCurrentProfileContext();

  if (!context) {
    redirect("/login");
  }

  if (context.profile.status !== "ACTIVE") {
    redirect("/login");
  }

  return context;
}

export async function requireAdmin() {
  const context = await requireAuth();

  if (!isAdminAccountType(context.profile.account_type)) {
    redirect("/employee/dashboard");
  }

  return context;
}

export async function requireEmployee() {
  const context = await requireAuth();

  if (!isEmployeeAccountType(context.profile.account_type)) {
    redirect("/admin/dashboard");
  }

  return context;
}
