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
  | "ARCHIVED"
  | "DELETED";

type ProfileRow = {
  id: number;
  auth_user_id: string;
  user_image: string | null;
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
      p.id,
      p.auth_user_id,
      u.image AS user_image,
      p.account_type,
      p.full_name,
      p.email,
      p.position,
      p.department,
      p.phone_number,
      p.status,
      p.must_change_password,
      p.first_login_completed_at,
      p.password_changed_at
    FROM profile p
    JOIN "user" u ON u.id = p.auth_user_id
    WHERE p.auth_user_id = $1
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
    user: {
      ...session.user,
      image: profile.user_image,
    },
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
