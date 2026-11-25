/**
 * The book's painted surfaces, drawn as SVG under `art/book/` and published
 * as WebP under `public/book/`. Regenerate with `pnpm book-art`.
 */
export const BOOK_ART_SOURCE_DIR = "art/book";
export const BOOK_ART_PUBLIC_DIR = "public/book";
export const BOOK_ART_PIXEL_RATIO = 2;

export interface BookArtPiece {
  /** File name in `art/book/`, and the base name of the WebP it becomes. */
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly quality: number;
  /**
   * What shows where the art draws nothing. Only the cover keeps transparency,
   * for its rounded corners on the desk: Chrome encodes a WebP with alpha
   * nearly losslessly, at three times the size.
   */
  readonly background: "transparent" | `#${string}`;
}

export const BOOK_ART: readonly BookArtPiece[] = [
  {
    name: "cover",
    width: 340,
    height: 520,
    quality: 0.88,
    background: "transparent",
  },
  {
    // Cropped to its frame: the half of the frame's line outside it falls on
    // the page's own paper colour.
    name: "frontispiece",
    width: 288,
    height: 628,
    quality: 0.82,
    background: "#e9d7ad",
  },
  {
    name: "desk-portrait",
    width: 390,
    height: 844,
    quality: 0.78,
    background: "#1a0d05",
  },
  {
    name: "desk-landscape",
    width: 1280,
    height: 860,
    quality: 0.78,
    background: "#1a0d05",
  },
];

/** Fonts the SVG lettering uses, as `[family, file under node_modules]`. */
export const BOOK_ART_FONTS: readonly (readonly [string, string])[] = [
  [
    "IM Fell English",
    "@fontsource/im-fell-english/files/im-fell-english-latin-400-normal.woff2",
  ],
];

export function sourcePath(piece: BookArtPiece): string {
  return `${BOOK_ART_SOURCE_DIR}/${piece.name}.svg`;
}

export function outputPath(piece: BookArtPiece): string {
  return `${BOOK_ART_PUBLIC_DIR}/${piece.name}.webp`;
}
