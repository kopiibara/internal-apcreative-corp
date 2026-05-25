export function getProfileAvatarSeed(profileId: number) {
  return `profile-${profileId}`;
}

/** Deterministic seed when profile ID is unavailable (never use raw email). */
export function getFallbackAvatarSeed(label: string) {
  let hash = 0;

  for (let index = 0; index < label.length; index += 1) {
    hash = (hash << 5) - hash + label.charCodeAt(index);
    hash |= 0;
  }

  return `label-${Math.abs(hash)}`;
}

export function resolveAvatarSeed(profileId?: number, name?: string | null) {
  if (profileId != null && profileId > 0) {
    return getProfileAvatarSeed(profileId);
  }

  if (name?.trim()) {
    return getFallbackAvatarSeed(name.trim());
  }

  return "profile-anonymous";
}
