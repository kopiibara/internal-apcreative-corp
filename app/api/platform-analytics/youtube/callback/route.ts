import { NextRequest, NextResponse } from "next/server";

import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { isAdminAccountType, type AccountType } from "@/lib/auth/account-type";
import {
  exchangeYouTubeOAuthCode,
  upsertYouTubeIntegrationFromOAuth,
} from "@/lib/platform-analytics/youtube-sync";
import { canSyncPlatformAnalytics } from "@/lib/platform-analytics/access";

export const runtime = "nodejs";

const YOUTUBE_OAUTH_STATE_COOKIE = "youtube_oauth_state";

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
  const basePath = accountType && isAdminAccountType(accountType)
    ? "/admin/platform-analytics"
    : "/employee/platform-analytics";
  const url = new URL(basePath, appOrigin(request));
  url.searchParams.set("platform", "YOUTUBE");
  url.searchParams.set("youtube_oauth", status);
  if (message) {
    url.searchParams.set("youtube_message", message.slice(0, 140));
  }
  return NextResponse.redirect(url);
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

  const stateFromCookie = request.cookies.get(
    YOUTUBE_OAUTH_STATE_COOKIE,
  )?.value;
  const stateFromQuery = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    const response = redirectWithStatus(request, "error", oauthError, accountType);
    response.cookies.delete(YOUTUBE_OAUTH_STATE_COOKIE);
    return response;
  }

  if (
    !stateFromCookie ||
    !stateFromQuery ||
    stateFromCookie !== stateFromQuery
  ) {
    const response = redirectWithStatus(
      request,
      "error",
      "State validation failed",
      accountType,
    );
    response.cookies.delete(YOUTUBE_OAUTH_STATE_COOKIE);
    return response;
  }

  if (!code) {
    const response = redirectWithStatus(
      request,
      "error",
      "Missing authorization code",
      accountType,
    );
    response.cookies.delete(YOUTUBE_OAUTH_STATE_COOKIE);
    return response;
  }

  try {
    const result = await exchangeYouTubeOAuthCode(code);

    // Debug: log tokens returned by Google to ensure refresh_token present
    try {

      console.log("YouTube OAuth token response:", result.tokens);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      /* ignore */
    }

    await upsertYouTubeIntegrationFromOAuth({
      createdByProfileId: context.profile.id,
      refreshToken: result.refreshToken,
      scopes: result.scopeSet,
      channel: result.channel,
    });

    const response = redirectWithStatus(request, "success", undefined, accountType);
    response.cookies.delete(YOUTUBE_OAUTH_STATE_COOKIE);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "YouTube OAuth callback failed";

    const response = redirectWithStatus(request, "error", message, accountType);
    response.cookies.delete(YOUTUBE_OAUTH_STATE_COOKIE);
    return response;
  }
}
