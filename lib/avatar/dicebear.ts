import { createAvatar } from "@dicebear/core";
import type { Style } from "@dicebear/core";
import {
  adventurer,
  adventurerNeutral,
  avataaars,
  avataaarsNeutral,
  bigEars,
  bigEarsNeutral,
  bigSmile,
  bottts,
  botttsNeutral,
  croodles,
  croodlesNeutral,
  dylan,
  funEmoji,
  glass,
  icons,
  identicon,
  initials,
  lorelei,
  loreleiNeutral,
  micah,
  miniavs,
  notionists,
  notionistsNeutral,
  openPeeps,
  personas,
  pixelArt,
  pixelArtNeutral,
  rings,
  shapes,
  thumbs,
  toonHead,
} from "@dicebear/collection";

const DICEBEAR_SIZE = 128;

export const DICEBEAR_COLLECTIONS = [
  { id: "adventurer", label: "Adventurer", collection: adventurer },
  { id: "adventurerNeutral", label: "Adventurer Neutral", collection: adventurerNeutral },
  { id: "avataaars", label: "Avataaars", collection: avataaars },
  { id: "avataaarsNeutral", label: "Avataaars Neutral", collection: avataaarsNeutral },
  { id: "bigEars", label: "Big Ears", collection: bigEars },
  { id: "bigEarsNeutral", label: "Big Ears Neutral", collection: bigEarsNeutral },
  { id: "bigSmile", label: "Big Smile", collection: bigSmile },
  { id: "bottts", label: "Bottts", collection: bottts },
  { id: "botttsNeutral", label: "Bottts Neutral", collection: botttsNeutral },
  { id: "croodles", label: "Croodles", collection: croodles },
  { id: "croodlesNeutral", label: "Croodles Neutral", collection: croodlesNeutral },
  { id: "dylan", label: "Dylan", collection: dylan },
  { id: "funEmoji", label: "Fun Emoji", collection: funEmoji },
  { id: "glass", label: "Glass", collection: glass },
  { id: "icons", label: "Icons", collection: icons },
  { id: "identicon", label: "Identicon", collection: identicon },
  { id: "initials", label: "Initials", collection: initials },
  { id: "lorelei", label: "Lorelei", collection: lorelei },
  { id: "loreleiNeutral", label: "Lorelei Neutral", collection: loreleiNeutral },
  { id: "micah", label: "Micah", collection: micah },
  { id: "miniavs", label: "Miniavs", collection: miniavs },
  { id: "notionists", label: "Notionists", collection: notionists },
  { id: "notionistsNeutral", label: "Notionists Neutral", collection: notionistsNeutral },
  { id: "openPeeps", label: "Open Peeps", collection: openPeeps },
  { id: "personas", label: "Personas", collection: personas },
  { id: "pixelArt", label: "Pixel Art", collection: pixelArt },
  { id: "pixelArtNeutral", label: "Pixel Art Neutral", collection: pixelArtNeutral },
  { id: "rings", label: "Rings", collection: rings },
  { id: "shapes", label: "Shapes", collection: shapes },
  { id: "thumbs", label: "Thumbs", collection: thumbs },
  { id: "toonHead", label: "Toon Head", collection: toonHead },
] as const;

export type DiceBearCollectionId = (typeof DICEBEAR_COLLECTIONS)[number]["id"];

export const DEFAULT_DICEBEAR_COLLECTION_ID: DiceBearCollectionId = "thumbs";

export function getDiceBearCollection(collectionId: string) {
  return (
    DICEBEAR_COLLECTIONS.find((collection) => collection.id === collectionId) ??
    DICEBEAR_COLLECTIONS.find(
      (collection) => collection.id === DEFAULT_DICEBEAR_COLLECTION_ID,
    )!
  );
}

export function createDiceBearDataUri(
  seed: string,
  collectionId: string = DEFAULT_DICEBEAR_COLLECTION_ID,
) {
  const collection = getDiceBearCollection(collectionId)
    .collection as unknown as Style<Record<string, unknown>>;
  const avatar = createAvatar(collection, {
    seed,
    size: DICEBEAR_SIZE,
  });

  const svg = avatar.toString();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
