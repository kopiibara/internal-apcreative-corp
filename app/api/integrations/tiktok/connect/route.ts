import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { isAdminAccountType } from "@/lib/auth/account-type";
import {
  getPlatformAnalyticsBrandScope,
  isBrandIdAllowed,
} from "@/lib/platform-analytics/brand-scope";
import { canSyncPlatformAnalytics } from "@/lib/platform-analytics/access";
import {
  isTikTokOAuthConfigured,
  TIKTOK_OAUTH_STATE_COOKIE,
} from "@/lib/tiktok/config";
import { buildTikTokAuthorizeUrl } from "@/lib/tiktok/oauth";

export const runtime = "nodejs";

const brandIdSchema = z.coerce.number().int().positive();

function getAppOrigin(request: NextRequest) {
  const betterAuthUrl = process.env.BETTER_AUTH_URL?.trim();
  if (betterAuthUrl) {
    return betterAuthUrl.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, getAppOrigin(request)));
}

export async function GET(request: NextRequest) {
  const context = await getCurrentProfileContext();

  if (!context || context.profile.status !== "ACTIVE") {
    return redirectTo(request, "/login");
  }

  const allowed = await canSyncPlatformAnalytics(
    context.profile.auth_user_id,
    context.profile.account_type,
    context.profile.id,
  );

  if (!allowed) {
    const unauthorizedPath = isAdminAccountType(context.profile.account_type)
      ? "/admin/unauthorized"
      : "/employee/unauthorized";
    return redirectTo(request, unauthorizedPath);
  }

  if (!isTikTokOAuthConfigured()) {
    return redirectTo(
      request,
      "/admin/platform-analytics?platform=TIKTOK&tiktok_oauth=error&tiktok_message=TikTok+OAuth+is+not+configured",
    );
  }

  const brandIdParam = request.nextUrl.searchParams.get("brandId");
  const parsedBrandId = brandIdSchema.safeParse(brandIdParam);

  if (!parsedBrandId.success) {
    return redirectTo(
      request,
      "/admin/platform-analytics?platform=TIKTOK&tiktok_oauth=error&tiktok_message=brandId+is+required",
    );
  }

  const scope = await getPlatformAnalyticsBrandScope(context.profile.id);

  if (!isBrandIdAllowed(parsedBrandId.data, scope)) {
    return redirectTo(request, "/admin/unauthorized");
  }

  const state = randomUUID();
  const cookiePayload = Buffer.from(
    JSON.stringify({
      state,
      brandId: parsedBrandId.data,
      profileId: context.profile.id,
    }),
  ).toString("base64url");

  const authUrl = buildTikTokAuthorizeUrl({
    state,
    origin: getAppOrigin(request),
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, cookiePayload, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
