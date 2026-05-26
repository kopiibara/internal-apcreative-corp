import { createAvatar } from "@dicebear/core";
import { thumbs } from "@dicebear/collection";

const DICEBEAR_SIZE = 128;

export function createDiceBearDataUri(seed: string) {
  const avatar = createAvatar(thumbs, {
    seed,
    size: DICEBEAR_SIZE,
  });

  const svg = avatar.toString();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
