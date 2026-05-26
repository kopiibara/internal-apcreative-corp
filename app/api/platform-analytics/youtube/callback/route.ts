import { NextRequest, NextResponse } from "next/server";

import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import {
  exchangeYouTubeOAuthCode,
  upsertYouTubeIntegrationFromOAuth,
} from "@/lib/platform-analytics/youtube-sync";
import { can } from "@/lib/permissions";

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
) {
  const url = new URL("/admin/platform-analytics", appOrigin(request));
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

  const allowed = await can(
    context.profile.auth_user_id,
    "meta_monitoring.manage",
  );

  if (!allowed) {
    return NextResponse.redirect(
      new URL("/admin/unauthorized", appOrigin(request)),
    );
  }

  const stateFromCookie = request.cookies.get(
    YOUTUBE_OAUTH_STATE_COOKIE,
  )?.value;
  const stateFromQuery = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    const response = redirectWithStatus(request, "error", oauthError);
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
    );
    response.cookies.delete(YOUTUBE_OAUTH_STATE_COOKIE);
    return response;
  }

  if (!code) {
    const response = redirectWithStatus(
      request,
      "error",
      "Missing authorization code",
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

    const response = redirectWithStatus(request, "success");
    response.cookies.delete(YOUTUBE_OAUTH_STATE_COOKIE);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "YouTube OAuth callback failed";

    const response = redirectWithStatus(request, "error", message);
    response.cookies.delete(YOUTUBE_OAUTH_STATE_COOKIE);
    return response;
  }
}
