import "server-only";

export type YouTubeChannelConfigKey = string;

export type YouTubeChannelConfig = {
  key: YouTubeChannelConfigKey;
  name: string;
  displayName: string;
  brandSlug: string;
  enabled: boolean;
  channelId: string;
  /** Server-only — never sent to the client. */
  refreshToken: string;
  channelIdEnvKey: string;
  refreshTokenEnvKey: string;
  channelNameEnvKey: string;
  enabledEnvKey: string;
};

function stripEnvQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function readEnv(name: string) {
  const raw = process.env[name];
  if (raw == null) {
    return "";
  }
  return stripEnvQuotes(raw);
}

function isEnvTrue(name: string) {
  return readEnv(name).toLowerCase() === "true";
}

function normalizeBrandKey(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function envPrefixFromBrandKey(brandKey: string) {
  return brandKey.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

type YouTubeChannelsConfigEntry = {
  brandKey: string;
  brandName: string;
  channelId?: string;
  refreshToken?: string;
  channelName?: string;
  enabled?: boolean;
};

function titleCaseFromEnvPrefix(prefix: string) {
  return prefix
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Discover enabled YouTube channels from env (refresh token optional until OAuth). */
function discoverYouTubeChannelsFromEnv(): YouTubeChannelsConfigEntry[] {
  const envKeys = Object.keys(process.env);
  const prefixes = new Set<string>();

  for (const key of envKeys) {
    if (key.endsWith("_YOUTUBE_ENABLED")) {
      prefixes.add(key.replace(/_YOUTUBE_ENABLED$/, ""));
    }
    if (key.endsWith("_YOUTUBE_CHANNEL_ID")) {
      prefixes.add(key.replace(/_YOUTUBE_CHANNEL_ID$/, ""));
    }
  }

  const entries: YouTubeChannelsConfigEntry[] = [];

  for (const prefix of prefixes) {
    const enabledEnvKey = `${prefix}_YOUTUBE_ENABLED`;
    const channelIdEnvKey = `${prefix}_YOUTUBE_CHANNEL_ID`;
    const refreshTokenEnvKey = `${prefix}_YOUTUBE_REFRESH_TOKEN`;
    const channelNameEnvKey = `${prefix}_YOUTUBE_CHANNEL_NAME`;

    if (envKeys.includes(enabledEnvKey) && !isEnvTrue(enabledEnvKey)) {
      continue;
    }

    if (!envKeys.includes(channelIdEnvKey)) {
      continue;
    }

    entries.push({
      brandKey: normalizeBrandKey(prefix),
      brandName: titleCaseFromEnvPrefix(prefix),
      channelId: channelIdEnvKey,
      refreshToken: envKeys.includes(refreshTokenEnvKey)
        ? refreshTokenEnvKey
        : undefined,
      channelName: channelNameEnvKey,
      enabled: envKeys.includes(enabledEnvKey) ? isEnvTrue(enabledEnvKey) : true,
    });
  }

  return entries;
}

function readYouTubeChannelsConfig(): YouTubeChannelsConfigEntry[] {
  const discovered = discoverYouTubeChannelsFromEnv();

  if (discovered.length > 0) {
    return discovered;
  }

  const raw = readEnv("YOUTUBE_CHANNELS_CONFIG");
  if (!raw) {
    return discovered;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return discovered;
    }
    return parsed as YouTubeChannelsConfigEntry[];
  } catch {
    return discovered;
  }
}

function buildChannelFromConfig(
  entry: YouTubeChannelsConfigEntry,
): YouTubeChannelConfig | null {
  if (!entry || typeof entry !== "object") return null;
  if (typeof entry.brandKey !== "string") {
    return null;
  }

  const key = normalizeBrandKey(entry.brandKey);
  if (!key) return null;

  const prefix = envPrefixFromBrandKey(entry.brandKey);
  const channelIdEnvKey =
    typeof entry.channelId === "string" && entry.channelId.trim()
      ? entry.channelId.trim()
      : `${prefix}_YOUTUBE_CHANNEL_ID`;
  const refreshTokenEnvKey =
    typeof entry.refreshToken === "string" && entry.refreshToken.trim()
      ? entry.refreshToken.trim()
      : `${prefix}_YOUTUBE_REFRESH_TOKEN`;
  const channelNameEnvKey = `${prefix}_YOUTUBE_CHANNEL_NAME`;
  const enabledEnvKey = `${prefix}_YOUTUBE_ENABLED`;

  const enabledFromEnv = process.env[enabledEnvKey]
    ? isEnvTrue(enabledEnvKey)
    : null;

  const displayNameFromEnv = readEnv(channelNameEnvKey);
  const displayName =
    displayNameFromEnv ||
    (typeof entry.brandName === "string" ? entry.brandName.trim() : "") ||
    titleCaseFromEnvPrefix(prefix) ||
    key;

  return {
    key,
    name: displayName,
    displayName,
    brandSlug: key,
    enabled:
      entry.enabled === false
        ? false
        : enabledFromEnv === null
          ? true
          : enabledFromEnv,
    channelId: readEnv(channelIdEnvKey),
    refreshToken: readEnv(refreshTokenEnvKey),
    channelIdEnvKey,
    refreshTokenEnvKey,
    channelNameEnvKey,
    enabledEnvKey,
  };
}

export const youtubeChannels: YouTubeChannelConfig[] = readYouTubeChannelsConfig()
  .map(buildChannelFromConfig)
  .filter((channel): channel is YouTubeChannelConfig => Boolean(channel));

/** Enabled via env (may be missing credentials). */
export function getEnabledYouTubeChannels() {
  return youtubeChannels.filter((channel) => channel.enabled);
}

/** Enabled + channel ID + refresh token in env (ready for sync, like Meta configured pages). */
export function isYouTubeChannelConfigured(channel: YouTubeChannelConfig) {
  return Boolean(channel.enabled && channel.channelId && channel.refreshToken);
}

export function getConfiguredYouTubeChannels() {
  return youtubeChannels.filter(isYouTubeChannelConfigured);
}

export function getYouTubeChannelByKey(key: YouTubeChannelConfigKey) {
  return youtubeChannels.find((channel) => channel.key === key);
}

export function getYouTubeChannelByChannelId(channelId: string) {
  const normalized = channelId.trim();
  return youtubeChannels.find(
    (channel) => channel.channelId && channel.channelId === normalized,
  );
}

/** Appears in selector when enabled, has channel ID, and env token or DB OAuth exists. */
export function isYouTubeChannelSelectable(
  channel: YouTubeChannelConfig,
  connectedChannelKeys: Set<string>,
  connectedChannelIds: Set<string>,
) {
  if (!channel.enabled || !channel.channelId) {
    return false;
  }

  return (
    Boolean(channel.refreshToken) ||
    connectedChannelKeys.has(channel.key) ||
    connectedChannelIds.has(channel.channelId)
  );
}

export function getSelectableYouTubeChannels(
  connectedChannelKeys: Set<string>,
  connectedChannelIds: Set<string>,
) {
  return getEnabledYouTubeChannels().filter((channel) =>
    isYouTubeChannelSelectable(channel, connectedChannelKeys, connectedChannelIds),
  );
}

/** Public channel metadata safe for the client (no tokens). */
export type YouTubeChannelOption = {
  key: string;
  displayName: string;
};

export function toYouTubeChannelOptions(
  channels: YouTubeChannelConfig[],
): YouTubeChannelOption[] {
  return channels.map((channel) => ({
    key: channel.key,
    displayName: channel.displayName,
  }));
}

export function getYouTubeChannelsEnvDiagnostics() {
  return youtubeChannels.map((channel) => ({
    key: channel.key,
    displayName: channel.displayName,
    enabled: channel.enabled,
    channelIdEnvKey: channel.channelIdEnvKey,
    refreshTokenEnvKey: channel.refreshTokenEnvKey,
    channelNameEnvKey: channel.channelNameEnvKey,
    enabledEnvKey: channel.enabledEnvKey,
    channelIdConfigured: Boolean(channel.channelId),
    tokenConfigured: Boolean(channel.refreshToken),
    ready: isYouTubeChannelConfigured(channel),
  }));
}
