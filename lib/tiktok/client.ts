import "server-only";

import { TIKTOK_DEFAULT_SCOPES } from "@/lib/tiktok/config";

type TikTokApiError = {
  code?: string;
  message?: string;
  log_id?: string;
};

type TikTokApiEnvelope<T> = {
  data?: T;
  error?: TikTokApiError;
};

export type TikTokUserInfo = {
  open_id: string;
  union_id?: string;
  avatar_url?: string;
  display_name?: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  username?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
};

export type TikTokVideoItem = {
  id: string;
  title?: string;
  video_description?: string;
  cover_image_url?: string;
  share_url?: string;
  embed_link?: string;
  duration?: number;
  create_time?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
};

export class TikTokApiScopeError extends Error {
  readonly missingScope: string;

  constructor(scope: string, message: string) {
    super(message);
    this.name = "TikTokApiScopeError";
    this.missingScope = scope;
  }
}

function isScopeError(error: TikTokApiError | undefined): string | null {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  if (code.includes("scope") || message.includes("scope")) {
    if (message.includes("user.info.stats") || code.includes("stats")) {
      return "user.info.stats";
    }
    if (message.includes("video.list")) {
      return "video.list";
    }
    if (message.includes("user.info.basic")) {
      return "user.info.basic";
    }
    return "unknown";
  }

  return null;
}

async function tiktokFetch<T>(
  url: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await response.json()) as TikTokApiEnvelope<T>;

  if (json.error) {
    const scope = isScopeError(json.error);
    if (scope) {
      throw new TikTokApiScopeError(
        scope,
        json.error.message ?? `Missing TikTok scope: ${scope}`,
      );
    }
    throw new Error(
      json.error.message ?? `TikTok API error (${json.error.code ?? "unknown"})`,
    );
  }

  if (!response.ok) {
    throw new Error(`TikTok API request failed (${response.status})`);
  }

  if (!json.data) {
    throw new Error("TikTok API returned an empty data payload.");
  }

  return json.data;
}

export async function fetchTikTokUserInfo(accessToken: string) {
  const fields = [
    "open_id",
    "union_id",
    "avatar_url",
    "display_name",
    "bio_description",
    "profile_deep_link",
    "is_verified",
    "username",
    "follower_count",
    "following_count",
    "likes_count",
    "video_count",
  ].join(",");

  const url = `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`;

  const data = await tiktokFetch<{ user: TikTokUserInfo }>(url, accessToken, {
    method: "GET",
  });

  return data.user;
}

export async function fetchTikTokVideoList(accessToken: string) {
  const fields = [
    "id",
    "title",
    "video_description",
    "cover_image_url",
    "share_url",
    "embed_link",
    "duration",
    "create_time",
    "view_count",
    "like_count",
    "comment_count",
    "share_count",
  ].join(",");

  const url = `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`;

  const data = await tiktokFetch<{
    videos: TikTokVideoItem[];
    cursor?: number;
    has_more?: boolean;
  }>(url, accessToken, {
    method: "POST",
    body: JSON.stringify({ max_count: 20 }),
  });

  return data.videos ?? [];
}

export function getRequiredTikTokScopes(): readonly string[] {
  return TIKTOK_DEFAULT_SCOPES;
}

export function findMissingTikTokScopes(granted: string[]): string[] {
  const normalizedGranted = new Set(granted.map((s) => s.trim().toLowerCase()));
  return TIKTOK_DEFAULT_SCOPES.filter(
    (scope) => !normalizedGranted.has(scope.toLowerCase()),
  );
}
