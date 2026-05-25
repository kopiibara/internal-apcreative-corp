"use server";

import { revalidatePath } from "next/cache";
import type { QueryResultRow } from "pg";

import {
  brandIdSchema,
  createBrandSchema,
  updateBrandSchema,
  type CreateBrandInput,
  type UpdateBrandInput,
} from "@/app/admin/brands/schema";
import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { query, transaction } from "@/lib/db";
import { can } from "@/lib/permissions";
import { enforceRateLimit } from "@/lib/rate-limit";

const BRANDS_PATH = "/admin/brands";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

type BrandDependencyCountRow = QueryResultRow & {
  content_report_count: number;
  user_brand_access_count: number;
  account_invite_brand_access_count: number;
};

async function authorizeBrandAction(
  permissionKeys: string[],
): Promise<ActionResult | null> {
  const context = await getCurrentProfileContext();

  if (!context) {
    return {
      success: false,
      message: "You must be signed in to perform this action.",
    };
  }

  if (context.profile.status !== "ACTIVE") {
    return {
      success: false,
      message: "Your account is not active.",
    };
  }

  const allowedChecks = await Promise.all(
    permissionKeys.map((permissionKey) =>
      can(context.profile.auth_user_id, permissionKey),
    ),
  );

  if (!allowedChecks.some(Boolean)) {
    return {
      success: false,
      message: "You do not have permission to perform this action.",
    };
  }

  return null;
}

async function enforceBrandMutationRateLimit() {
  return enforceRateLimit({
    bucket: "brand-management",
    limit: 30,
    windowMs: 60_000,
  });
}

function getValidationMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray(error.issues)
  ) {
    const issue = error.issues[0] as { message?: string } | undefined;
    return issue?.message ?? "Please check the submitted brand details.";
  }

  return "Please check the submitted brand details.";
}

function isUniqueViolation(error: unknown) {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
  );
}

async function getBrandDependencyCounts(brandId: number) {
  const result = await query<BrandDependencyCountRow>(
    `
    SELECT
      (
        SELECT COUNT(*)::int
        FROM content_report
        WHERE brand_id = $1
      ) AS content_report_count,
      (
        SELECT COUNT(*)::int
        FROM user_brand_access
        WHERE brand_id = $1
      ) AS user_brand_access_count,
      (
        SELECT COUNT(*)::int
        FROM account_invite_brand_access
        WHERE brand_id = $1
      ) AS account_invite_brand_access_count
    `,
    [brandId],
  );

  return result.rows[0];
}

export async function createBrand(
  input: CreateBrandInput,
): Promise<ActionResult> {
  const authError = await authorizeBrandAction(["brands.create"]);
  if (authError) {
    return authError;
  }

  const rateLimit = await enforceBrandMutationRateLimit();
  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = createBrandSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: getValidationMessage(parsed.error) };
  }

  try {
    await query(
      `
      INSERT INTO brand (
        name,
        slug,
        description,
        brand_image_url,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        parsed.data.name,
        parsed.data.slug,
        parsed.data.description,
        parsed.data.brandImageUrl,
        parsed.data.isActive,
      ],
    );

    revalidatePath(BRANDS_PATH);

    return { success: true, message: "Brand created." };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        message: "A brand with this slug already exists.",
      };
    }

    console.error("createBrand failed:", error);
    return { success: false, message: "Could not create the brand." };
  }
}

export async function updateBrand(
  input: UpdateBrandInput,
): Promise<ActionResult> {
  const authError = await authorizeBrandAction(["brands.update"]);
  if (authError) {
    return authError;
  }

  const rateLimit = await enforceBrandMutationRateLimit();
  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = updateBrandSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: getValidationMessage(parsed.error) };
  }

  try {
    const result = await query(
      `
      UPDATE brand
      SET
        name = $2,
        slug = $3,
        description = $4,
        brand_image_url = $5,
        is_active = $6,
        updated_at = now()
      WHERE id = $1
      `,
      [
        parsed.data.brandId,
        parsed.data.name,
        parsed.data.slug,
        parsed.data.description,
        parsed.data.brandImageUrl,
        parsed.data.isActive,
      ],
    );

    if (result.rowCount === 0) {
      return { success: false, message: "Brand was not found." };
    }

    revalidatePath(BRANDS_PATH);

    return { success: true, message: "Brand updated." };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        message: "A brand with this slug already exists.",
      };
    }

    console.error("updateBrand failed:", error);
    return { success: false, message: "Could not update the brand." };
  }
}

export async function deactivateBrand(input: {
  brandId: number;
}): Promise<ActionResult> {
  const authError = await authorizeBrandAction([
    "brands.deactivate",
    "brands.update",
  ]);
  if (authError) {
    return authError;
  }

  const rateLimit = await enforceBrandMutationRateLimit();
  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = brandIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: getValidationMessage(parsed.error) };
  }

  const result = await query(
    `
    UPDATE brand
    SET is_active = false, updated_at = now()
    WHERE id = $1
    `,
    [parsed.data.brandId],
  );

  if (result.rowCount === 0) {
    return { success: false, message: "Brand was not found." };
  }

  revalidatePath(BRANDS_PATH);

  return { success: true, message: "Brand deactivated." };
}

export async function reactivateBrand(input: {
  brandId: number;
}): Promise<ActionResult> {
  const authError = await authorizeBrandAction([
    "brands.deactivate",
    "brands.update",
  ]);
  if (authError) {
    return authError;
  }

  const rateLimit = await enforceBrandMutationRateLimit();
  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = brandIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: getValidationMessage(parsed.error) };
  }

  const result = await query(
    `
    UPDATE brand
    SET is_active = true, updated_at = now()
    WHERE id = $1
    `,
    [parsed.data.brandId],
  );

  if (result.rowCount === 0) {
    return { success: false, message: "Brand was not found." };
  }

  revalidatePath(BRANDS_PATH);

  return { success: true, message: "Brand reactivated." };
}

export async function deleteBrand(input: {
  brandId: number;
}): Promise<ActionResult> {
  const authError = await authorizeBrandAction(["brands.delete"]);
  if (authError) {
    return authError;
  }

  const rateLimit = await enforceBrandMutationRateLimit();
  if (!rateLimit.success) {
    return { success: false, message: rateLimit.message };
  }

  const parsed = brandIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: getValidationMessage(parsed.error) };
  }

  try {
    const deleted = await transaction(async (client) => {
      const dependencyCounts = await getBrandDependencyCounts(
        parsed.data.brandId,
      );
      const hasRelatedRecords =
        dependencyCounts.content_report_count > 0 ||
        dependencyCounts.user_brand_access_count > 0 ||
        dependencyCounts.account_invite_brand_access_count > 0;

      if (hasRelatedRecords) {
        return false;
      }

      const result = await client.query(
        `
        DELETE FROM brand
        WHERE id = $1
        `,
        [parsed.data.brandId],
      );

      return (result.rowCount ?? 0) > 0;
    });

    if (!deleted) {
      return {
        success: false,
        message:
          "This brand has related records. Please deactivate it instead.",
      };
    }

    revalidatePath(BRANDS_PATH);

    return { success: true, message: "Brand deleted." };
  } catch (error) {
    console.error("deleteBrand failed:", error);
    return { success: false, message: "Could not delete the brand." };
  }
}
