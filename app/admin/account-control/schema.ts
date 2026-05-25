import { z } from "zod";

import { DEFAULT_DEPARTMENT } from "@/lib/auth/account-defaults";
import {
  accountTypes,
  type AccountType,
  isEmployeeAccountType,
} from "@/lib/auth/account-type";

export { accountTypes, type AccountType };

export const profileStatuses = [
  "ACTIVE",
  "INVITED",
  "DISABLED",
  "SUSPENDED",
  "ARCHIVED",
  "DELETED",
] as const;

export type ProfileStatus = (typeof profileStatuses)[number];

const optionalTextSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  return value ?? null;
}, z.string().nullable());

export const brandAssignmentSchema = z.object({
  brandId: z.coerce.number().int().positive("Select a brand."),
  roleId: z.coerce.number().int().positive("Select a role."),
  isPrimary: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
});

export function validateBrandAssignments(
  accountType: AccountType,
  assignments: z.infer<typeof brandAssignmentSchema>[],
  context: z.RefinementCtx,
) {
  const seenBrandIds = new Set<number>();

  assignments.forEach((assignment, index) => {
    if (seenBrandIds.has(assignment.brandId)) {
      context.addIssue({
        code: "custom",
        path: ["brandAssignments", index, "brandId"],
        message: "Each brand can only be selected once.",
      });
    }

    seenBrandIds.add(assignment.brandId);
  });

  if (!isEmployeeAccountType(accountType)) {
    return;
  }

  const activeAssignments = assignments.filter(
    (assignment) => assignment.isActive,
  );
  const activePrimaryAssignments = activeAssignments.filter(
    (assignment) => assignment.isPrimary,
  );

  if (activeAssignments.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["brandAssignments"],
      message: "CLIENT and EMPLOYEE accounts need at least one active brand.",
    });
  }

  if (activePrimaryAssignments.length !== 1) {
    context.addIssue({
      code: "custom",
      path: ["brandAssignments"],
      message:
        "CLIENT and EMPLOYEE accounts need exactly one primary active brand.",
    });
  }
}

export const createAccountSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  department: optionalTextSchema.default(DEFAULT_DEPARTMENT),
  phoneNumber: optionalTextSchema,
  status: z.enum(profileStatuses).default("ACTIVE"),
  brandAssignments: z.array(brandAssignmentSchema).default([]),
});

export const updateAccountSchema = z.object({
  profileId: z.coerce.number().int().positive(),
  fullName: z.string().trim().min(1, "Full name is required."),
  department: optionalTextSchema,
  phoneNumber: optionalTextSchema,
  status: z.enum(profileStatuses),
});

export const disableAccountSchema = z.object({
  profileId: z.coerce.number().int().positive(),
});

export const forceChangePasswordSchema = z.object({
  profileId: z.coerce.number().int().positive(),
  requirePasswordChange: z.coerce.boolean().default(true),
  reason: optionalTextSchema,
});

export const softDeleteAccountSchema = z.object({
  profileId: z.coerce.number().int().positive(),
  reason: optionalTextSchema,
});

export const assignBrandAccessSchema = z.object({
  profileId: z.coerce.number().int().positive(),
  brandId: z.coerce.number().int().positive("Select a brand."),
  roleId: z.coerce.number().int().positive("Select a role."),
  isPrimary: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
});

export const removeBrandAccessSchema = z.object({
  profileId: z.coerce.number().int().positive(),
  brandId: z.coerce.number().int().positive(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AssignBrandAccessInput = z.infer<typeof assignBrandAccessSchema>;
export type ForceChangePasswordInput = z.infer<typeof forceChangePasswordSchema>;
export type SoftDeleteAccountInput = z.infer<typeof softDeleteAccountSchema>;
