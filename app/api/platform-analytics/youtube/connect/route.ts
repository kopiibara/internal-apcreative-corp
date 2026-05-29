import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { getCurrentProfileContext } from "@/lib/auth/auth-session";
import { isAdminAccountType } from "@/lib/auth/account-type";
import { buildYouTubeOAuthUrl } from "@/lib/platform-analytics/youtube-client";
import { canManagePlatformAnalytics } from "@/lib/platform-analytics/access";

export const runtime = "nodejs";

const YOUTUBE_OAUTH_STATE_COOKIE = "youtube_oauth_state";

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

  const allowed = await canManagePlatformAnalytics(context.profile.auth_user_id);

  if (!allowed) {
    const unauthorizedPath = isAdminAccountType(context.profile.account_type)
      ? "/admin/unauthorized"
      : "/employee/unauthorized";
    return redirectTo(request, unauthorizedPath);
  }

  const state = randomUUID();
  const authUrl = buildYouTubeOAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
