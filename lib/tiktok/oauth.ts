import "server-only";

import {
  getTikTokClientKey,
  getTikTokClientSecret,
  getTikTokRedirectUri,
  TIKTOK_DEFAULT_SCOPES,
} from "@/lib/tiktok/config";

type TikTokTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  open_id?: string;
  scope?: string;
  token_type?: string;
};

type TikTokTokenError = {
  error?: string;
  error_description?: string;
  message?: string;
};

function parseScopes(scope: string | undefined): string[] {
  if (!scope?.trim()) {
    return [];
  }
  return scope
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildTikTokAuthorizeUrl(input: {
  state: string;
  origin: string;
}): string {
  const clientKey = getTikTokClientKey();
  const redirectUri = getTikTokRedirectUri(input.origin);
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: TIKTOK_DEFAULT_SCOPES.join(","),
    redirect_uri: redirectUri,
    state: input.state,
  });

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

async function requestTikTokToken(
  body: Record<string, string>,
): Promise<TikTokTokenResponse> {
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  const json = (await response.json()) as {
    data?: TikTokTokenResponse;
    error?: TikTokTokenError;
  };

  if (!response.ok || json.error) {
    const message =
      json.error?.error_description ||
      json.error?.message ||
      json.error?.error ||
      `TikTok token request failed (${response.status})`;
    throw new Error(message);
  }

  const data = json.data;
  if (!data?.access_token) {
    throw new Error("TikTok token response did not include an access token.");
  }

  return data;
}

export async function exchangeTikTokAuthorizationCode(input: {
  code: string;
  origin: string;
}) {
  const clientKey = getTikTokClientKey();
  const clientSecret = getTikTokClientSecret();
  const redirectUri = getTikTokRedirectUri(input.origin);

  const data = await requestTikTokToken({
    client_key: clientKey,
    client_secret: clientSecret,
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const expiresAt =
    data.expires_in != null
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    openId: data.open_id ?? null,
    scopes: parseScopes(data.scope),
    expiresAt,
  };
}

export async function refreshTikTokAccessToken(refreshToken: string) {
  const clientKey = getTikTokClientKey();
  const clientSecret = getTikTokClientSecret();

  const data = await requestTikTokToken({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const expiresAt =
    data.expires_in != null
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    openId: data.open_id ?? null,
    scopes: parseScopes(data.scope),
    expiresAt,
  };
}
