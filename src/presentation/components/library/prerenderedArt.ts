import manifest from "./catalogThumbnails.json";
import { PUBLIC_BASE_PATH } from "@/shared/config/publicBasePath";

/**
 * Where the images made by `pnpm thumbnails` are served. Only the standard
 * deck has them; any other deck draws its own art.
 */

interface Manifest {
  readonly deckId: string;
  readonly directory: string;
  readonly width: number;
  readonly height: number;
  readonly cards: Readonly<Record<string, string>>;
  readonly back?: string;
  readonly backSmall?: string;
}

const prerendered: Manifest = manifest;

function urlOf(file: string): string {
  return `${PUBLIC_BASE_PATH}/${prerendered.directory}/${file}`;
}

/** Pixel size of a pre-rendered face, for the image's intrinsic size. */
export const prerenderedFaceSize = {
  width: prerendered.width,
  height: prerendered.height,
} as const;

/** The pre-rendered face for a card, when there is one. */
export function catalogThumbnailUrl(
  deckId: string,
  cardId: string,
): string | undefined {
  if (deckId !== prerendered.deckId) return undefined;
  const file = prerendered.cards[cardId];
  return file ? urlOf(file) : undefined;
}

/** The pre-rendered card back, when there is one. */
export function cardBackUrl(deckId: string): string | undefined {
  if (deckId !== prerendered.deckId || !prerendered.back) return undefined;
  return urlOf(prerendered.back);
}

/** The card back at half size, for the many small cards in the air. */
export function cardBackSmallUrl(deckId: string): string | undefined {
  if (deckId !== prerendered.deckId) return undefined;
  const file = prerendered.backSmall ?? prerendered.back;
  return file ? urlOf(file) : undefined;
}
