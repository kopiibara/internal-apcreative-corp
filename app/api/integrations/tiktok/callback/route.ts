import { NextRequest, NextResponse } from "next/server";

import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { isAdminAccountType, type AccountType } from "@/lib/auth/account-type";
import {
  getPlatformAnalyticsBrandScope,
  isBrandIdAllowed,
} from "@/lib/platform-analytics/brand-scope";
import { canSyncPlatformAnalytics } from "@/lib/platform-analytics/access";
import { TIKTOK_OAUTH_STATE_COOKIE } from "@/lib/tiktok/config";
import { exchangeTikTokAuthorizationCode } from "@/lib/tiktok/oauth";
import { saveTikTokOAuthConnection } from "@/lib/tiktok/integration-db";
import { syncTikTokForBrand } from "@/lib/tiktok/sync";

export const runtime = "nodejs";

type OAuthStateCookie = {
  state: string;
  brandId: number;
  profileId: number;
};

function appOrigin(request: NextRequest) {
  const betterAuthUrl = process.env.BETTER_AUTH_URL?.trim();
  if (betterAuthUrl) {
    return betterAuthUrl.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function redirectWithStatus(
  request: NextRequest,
  status: "success" | "error",
  message?: string,
  accountType?: AccountType,
) {
  const basePath =
    accountType && isAdminAccountType(accountType)
      ? "/admin/platform-analytics"
      : "/employee/platform-analytics";
  const url = new URL(basePath, appOrigin(request));
  url.searchParams.set("platform", "TIKTOK");
  url.searchParams.set("tiktok_oauth", status);
  if (message) {
    url.searchParams.set("tiktok_message", message.slice(0, 180));
  }
  return NextResponse.redirect(url);
}

function parseStateCookie(value: string | undefined): OAuthStateCookie | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as OAuthStateCookie;

    if (
      !parsed.state ||
      !Number.isFinite(parsed.brandId) ||
      !Number.isFinite(parsed.profileId)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const context = await getCurrentProfileContext();

  if (!context || context.profile.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/login", appOrigin(request)));
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
    return NextResponse.redirect(
      new URL(unauthorizedPath, appOrigin(request)),
    );
  }

  const accountType = context.profile.account_type;
  const stateCookie = parseStateCookie(
    request.cookies.get(TIKTOK_OAUTH_STATE_COOKIE)?.value,
  );
  const stateFromQuery = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    const response = redirectWithStatus(request, "error", oauthError, accountType);
    response.cookies.delete(TIKTOK_OAUTH_STATE_COOKIE);
    return response;
  }

  if (
    !stateCookie ||
    !stateFromQuery ||
    stateCookie.state !== stateFromQuery
  ) {
    const response = redirectWithStatus(
      request,
      "error",
      "State validation failed",
      accountType,
    );
    response.cookies.delete(TIKTOK_OAUTH_STATE_COOKIE);
    return response;
  }

  if (stateCookie.profileId !== context.profile.id) {
    const response = redirectWithStatus(
      request,
      "error",
      "OAuth session mismatch",
      accountType,
    );
    response.cookies.delete(TIKTOK_OAUTH_STATE_COOKIE);
    return response;
  }

  const brandScope = await getPlatformAnalyticsBrandScope(context.profile.id);

  if (!isBrandIdAllowed(stateCookie.brandId, brandScope)) {
    const response = redirectWithStatus(
      request,
      "error",
      "Brand access denied",
      accountType,
    );
    response.cookies.delete(TIKTOK_OAUTH_STATE_COOKIE);
    return response;
  }

  if (!code) {
    const response = redirectWithStatus(
      request,
      "error",
      "Missing authorization code",
      accountType,
    );
    response.cookies.delete(TIKTOK_OAUTH_STATE_COOKIE);
    return response;
  }

  try {
    const tokenResult = await exchangeTikTokAuthorizationCode({
      code,
      origin: appOrigin(request),
    });

    const openId = tokenResult.openId;
    if (!openId) {
      throw new Error("TikTok did not return an open_id for this account.");
    }

    await saveTikTokOAuthConnection({
      brandId: stateCookie.brandId,
      openId,
      accountName: null,
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      scopes: tokenResult.scopes,
      expiresAt: tokenResult.expiresAt,
    });

    try {
      await syncTikTokForBrand(stateCookie.brandId);
    } catch {
      // Initial sync can fail if scopes are partial; connection still succeeded.
    }

    const response = redirectWithStatus(request, "success", undefined, accountType);
    response.cookies.delete(TIKTOK_OAUTH_STATE_COOKIE);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TikTok OAuth callback failed";

    const response = redirectWithStatus(request, "error", message, accountType);
    response.cookies.delete(TIKTOK_OAUTH_STATE_COOKIE);
    return response;
  }
}
