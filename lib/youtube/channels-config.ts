import "server-only";

export type YouTubeChannelConfigKey = string;

export type YouTubeChannelConfig = {
  key: YouTubeChannelConfigKey;
  name: string;
  displayName: string;
  brandSlug: string;
  enabled: boolean;
  channelId: string;
  channelIdEnvKey: string;
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

type YouTubeChannelsConfigEntry = {
  brandKey: string;
  brandName: string;
  channelId?: string;
  enabled?: boolean;
};

function titleCaseFromEnvPrefix(prefix: string) {
  return prefix
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function discoverYouTubeChannelsFromEnv(): YouTubeChannelsConfigEntry[] {
  const envKeys = Object.keys(process.env);
  const enabledKeys = envKeys.filter((key) => key.endsWith("_YOUTUBE_ENABLED"));

  const entries: YouTubeChannelsConfigEntry[] = [];

  for (const enabledEnvKey of enabledKeys) {
    const prefix = enabledEnvKey.replace(/_YOUTUBE_ENABLED$/, "");
    const channelIdEnvKey = `${prefix}_YOUTUBE_CHANNEL_ID`;

    entries.push({
      brandKey: normalizeBrandKey(prefix),
      brandName: titleCaseFromEnvPrefix(prefix),
      channelId: envKeys.includes(channelIdEnvKey) ? channelIdEnvKey : undefined,
      enabled: isEnvTrue(enabledEnvKey),
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
  if (typeof entry.brandKey !== "string" || typeof entry.brandName !== "string") {
    return null;
  }

  const key = normalizeBrandKey(entry.brandKey);
  if (!key) return null;

  const prefix = entry.brandKey.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const enabledEnvKey = `${prefix}_YOUTUBE_ENABLED`;
  const channelIdEnvKey =
    typeof entry.channelId === "string" && entry.channelId.trim()
      ? entry.channelId.trim()
      : `${prefix}_YOUTUBE_CHANNEL_ID`;

  const enabledFromEnv = process.env[enabledEnvKey]
    ? isEnvTrue(enabledEnvKey)
    : null;

  return {
    key,
    name: entry.brandName.trim() || key,
    displayName: entry.brandName.trim() || key,
    brandSlug: key,
    enabled:
      entry.enabled === false
        ? false
        : enabledFromEnv === null
          ? true
          : enabledFromEnv,
    channelId: readEnv(channelIdEnvKey),
    channelIdEnvKey,
    enabledEnvKey,
  };
}

export const youtubeChannels: YouTubeChannelConfig[] = readYouTubeChannelsConfig()
  .map(buildChannelFromConfig)
  .filter((channel): channel is YouTubeChannelConfig => Boolean(channel));

export function getEnabledYouTubeChannels() {
  return youtubeChannels.filter((channel) => channel.enabled);
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

export function isYouTubeChannelConfigured(channel: YouTubeChannelConfig) {
  return Boolean(channel.enabled && channel.channelId);
}

export function getYouTubeChannelsEnvDiagnostics() {
  return youtubeChannels.map((channel) => ({
    key: channel.key,
    displayName: channel.displayName,
    enabled: channel.enabled,
    channelIdEnvKey: channel.channelIdEnvKey,
    enabledEnvKey: channel.enabledEnvKey,
    channelIdConfigured: Boolean(channel.channelId),
  }));
}
