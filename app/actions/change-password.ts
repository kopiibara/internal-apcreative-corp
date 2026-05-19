"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { getCurrentProfileContext } from "@/lib/auth-session"
import { query } from "@/lib/db"
import { enforceRateLimit } from "@/lib/rate-limit"
import { getDefaultTemporaryPassword } from "@/lib/server/account-secrets"

export type ChangePasswordResult = {
  success: boolean
  message: string
}

const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "New password and confirmation must match.",
      })
    }
  })

export async function changeOwnPassword(
  input: unknown
): Promise<ChangePasswordResult> {
  const context = await getCurrentProfileContext()

  if (!context) {
    return {
      success: false,
      message: "You must be signed in to change your password.",
    }
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      success: false,
      message: "Your account is not active.",
    }
  }

  const rateLimit = await enforceRateLimit({
    bucket: "auth:change-password",
    limit: 10,
    windowMs: 10 * 60 * 1000,
  })

  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message }
  }

  const parsed = changeOwnPasswordSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid password details.",
    }
  }

  let defaultTemporaryPassword: string

  try {
    defaultTemporaryPassword = getDefaultTemporaryPassword()
  } catch {
    return {
      success: false,
      message: "Default temporary password is not configured.",
    }
  }

  if (parsed.data.newPassword === defaultTemporaryPassword) {
    return {
      success: false,
      message: "Choose a password different from the temporary password.",
    }
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    })

    await query(
      `
      UPDATE profile
      SET
        must_change_password = false,
        first_login_completed_at = COALESCE(first_login_completed_at, now()),
        password_changed_at = now(),
        updated_at = now()
      WHERE id = $1
      `,
      [context.profile.id]
    )

    revalidatePath("/admin", "layout")
    revalidatePath("/employee", "layout")

    return {
      success: true,
      message: "Password changed successfully.",
    }
  } catch (error) {
    console.error("changeOwnPassword failed:", error)

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to change password. Check your current password and try again.",
    }
  }
}
