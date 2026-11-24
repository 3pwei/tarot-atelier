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
   * Keeps transparency: the cover's rounded corners sit on the desk, and the
   * frontispiece is ink on the page's own paper.
   */
  readonly transparent: boolean;
}

export const BOOK_ART: readonly BookArtPiece[] = [
  { name: "cover", width: 340, height: 520, quality: 0.88, transparent: true },
  {
    name: "frontispiece",
    width: 300,
    height: 640,
    quality: 0.88,
    transparent: true,
  },
  {
    name: "desk-portrait",
    width: 390,
    height: 844,
    quality: 0.78,
    transparent: false,
  },
  {
    name: "desk-landscape",
    width: 1280,
    height: 860,
    quality: 0.78,
    transparent: false,
  },
];

/** Fonts the SVG lettering uses, as `[family, file under node_modules]`. */
export const BOOK_ART_FONTS: readonly (readonly [string, string])[] = [
  [
    "Pinyon Script",
    "@fontsource/pinyon-script/files/pinyon-script-latin-400-normal.woff2",
  ],
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
