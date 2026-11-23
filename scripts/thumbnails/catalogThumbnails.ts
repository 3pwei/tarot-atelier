/**
 * Pre-rendered card art: the library's faces and the back shown 78 times in
 * the fanned deck. Drawing that many large SVG cards is slow on budget
 * phones; a small image decodes cheaply, and once for every copy. The SVG stays the single source of the art: these
 * images are generated from it with `pnpm thumbnails`, and a test fails when
 * the art changes without them being regenerated.
 */
import { createHash } from "node:crypto";

export const THUMBNAIL_MANIFEST_VERSION = 1;

/**
 * The deck whose procedural faces are pre-rendered. Scripts run under plain
 * Node and cannot resolve the app's `@/` imports, so the ID is repeated here;
 * a test keeps it equal to the domain's `STANDARD_DECK_ID`.
 */
export const THUMBNAIL_DECK_ID = "atelier-standard-tarot";

/** Where the manifest lives; the library imports it at build time. */
export const MANIFEST_PATH =
  "src/presentation/components/library/catalogThumbnails.json";

/** Images under `public/`, served at the same path below the base path. */
export const THUMBNAIL_PUBLIC_DIR = `decks/${THUMBNAIL_DECK_ID}/thumbnails`;

/** CSS width of a captured card; captured at twice that for sharp screens. */
export const CAPTURE_CSS_WIDTH = 180;
export const CAPTURE_PIXEL_RATIO = 2;
export const WEBP_QUALITY = 0.82;

/**
 * Every file that decides how a card face looks. Changing any of them
 * changes the hash and asks for new thumbnails.
 */
export const ARTWORK_SOURCES: readonly string[] = [
  "src/domain/deck/builtinDecks.ts",
  "src/presentation/components/CardArtwork.tsx",
  "src/presentation/components/cards/CardFrame.tsx",
  "src/presentation/components/cards/MajorArt.tsx",
  "src/presentation/components/cards/ProceduralBack.tsx",
  "src/presentation/components/cards/ProceduralFace.tsx",
  "src/presentation/components/cards/SuitGlyph.tsx",
  "src/presentation/components/cards/cardPalette.ts",
  "src/presentation/components/cards/inkKit.tsx",
  "src/presentation/components/cards/pipLayout.ts",
  "src/app/card-artwork.css",
];

export interface ThumbnailManifest {
  readonly version: number;
  readonly deckId: string;
  /** Folder below `public/` (and the base path) that holds the images. */
  readonly directory: string;
  /** Hash of ARTWORK_SOURCES when the images were made; empty when none exist. */
  readonly sourceHash: string;
  readonly width: number;
  readonly height: number;
  /** Card id → file name inside THUMBNAIL_PUBLIC_DIR. */
  readonly cards: Readonly<Record<string, string>>;
  /** The card back, shared by every card of the fanned deck. */
  readonly back?: string;
  /** The back at half size, for the many small cards in the air. */
  readonly backSmall?: string;
}

export function emptyManifest(): ThumbnailManifest {
  return {
    version: THUMBNAIL_MANIFEST_VERSION,
    deckId: THUMBNAIL_DECK_ID,
    directory: THUMBNAIL_PUBLIC_DIR,
    sourceHash: "",
    width: 0,
    height: 0,
    cards: {},
  };
}

/** Hashes the artwork sources in a fixed order; `read` returns a file's text. */
export function artworkSourceHash(read: (path: string) => string): string {
  const hash = createHash("sha256");
  for (const path of ARTWORK_SOURCES) {
    hash.update(path).update("\0").update(read(path)).update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}

export const BACK_FILE_NAME = "back.webp";
export const BACK_SMALL_FILE_NAME = "back-small.webp";
/** The small back's width over the full back's. */
export const BACK_SMALL_SCALE = 0.5;

/** File name for a card id, safe on every file system and URL. */
export function thumbnailFileName(cardId: string): string {
  return `${cardId.replace(/[^a-z0-9.-]/giu, "-")}.webp`;
}
