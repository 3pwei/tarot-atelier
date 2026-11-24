/**
 * Opening the book: the cover glows, swings open, blank leaves riffle past,
 * and the camera leans in. On a phone it stops with the frontispiece filling
 * the screen; on a wide screen the open book stays on the desk.
 */

export const OPENING = {
  coverAtMs: 550,
  coverMs: 600,
  /**
   * Blank leaves before the one whose back is the frontispiece. Each is a
   * layer the size of the open page: a few, spaced out, read as many.
   */
  sheets: 6,
  riffleAtMs: 900,
  sheetGapMs: 110,
  sheetMs: 420,
  /** The last leaf, the frontispiece's, lands a little more slowly. */
  lastSheetMs: 550,
  cameraAtMs: 550,
  cameraMs: 1500,
} as const;

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** Where the closed book lies on screen when it is tapped. */
export interface BookRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface OpeningCamera {
  /** The two pages of a spread face each other, on the desk. */
  readonly facingPages: boolean;
  readonly bookLeft: number;
  readonly bookTop: number;
  readonly bookWidth: number;
  readonly bookHeight: number;
  /** How far the camera leans in. */
  readonly scale: number;
  /** How far the camera slides, so the left page (or the spread) comes to the middle. */
  readonly shiftX: number;
  readonly shiftY: number;
  /**
   * The desk leans in far less than the book: scaling a whole screen of wood
   * several times over is more than a phone's GPU can composite smoothly,
   * and once the page fills the screen the desk is out of sight anyway.
   */
  readonly deskScale: number;
}

/**
 * The open book's final rectangle, where the camera leaves it. The scene lays
 * the book out at this size and starts it scaled down onto the closed book,
 * so its leaves are drawn once at the size they end at, never several times
 * larger than the screen.
 */
export function finalBookRect(
  camera: OpeningCamera,
  viewport: Viewport,
): BookRect {
  const centreX = viewport.width / 2;
  const centreY = viewport.height / 2;
  return {
    left: centreX + camera.shiftX + camera.scale * (camera.bookLeft - centreX),
    top: centreY + camera.shiftY + camera.scale * (camera.bookTop - centreY),
    width: camera.bookWidth * camera.scale,
    height: camera.bookHeight * camera.scale,
  };
}

/** How much of the camera's lean the desk follows. */
const DESK_FOLLOWS = 0.3;

function deskScaleFor(scale: number): number {
  return 1 + (scale - 1) * DESK_FOLLOWS;
}

const WIDE_MIN_WIDTH = 900;

/** Wide screens show both pages of a spread; phones one page at a time. */
export function hasFacingPages({ width, height }: Viewport): boolean {
  return width >= WIDE_MIN_WIDTH && width / height >= 1;
}

/**
 * Where the camera ends; it starts on the closed book, exactly where the
 * cover page laid it out, so nothing jumps when the scene takes over.
 */
export function openingCamera(
  viewport: Viewport,
  book: BookRect,
): OpeningCamera {
  const facingPages = hasFacingPages(viewport);
  const base = {
    facingPages,
    bookLeft: book.left,
    bookTop: book.top,
    bookWidth: book.width,
    bookHeight: book.height,
  };
  // The camera scales about the screen's middle; aim it at the book's spine.
  const spineX = book.left - viewport.width / 2;
  const middleY = book.top + book.height / 2 - viewport.height / 2;
  if (facingPages) {
    const scale = Math.min(
      (viewport.width * 0.8) / (2 * book.width),
      (viewport.height * 0.82) / book.height,
    );
    return {
      ...base,
      scale,
      shiftX: -spineX * scale,
      shiftY: -middleY * scale,
      deskScale: deskScaleFor(scale),
    };
  }
  // Edge to edge: the page's paper margins run off the sides, the plate stays whole.
  const scale =
    Math.max(viewport.width / book.width, viewport.height / book.height) * 1.02;
  const leftPageMiddle = spineX - book.width / 2;
  return {
    ...base,
    scale,
    shiftX: -leftPageMiddle * scale,
    shiftY: -middleY * scale,
    deskScale: deskScaleFor(scale),
  };
}

/** When the last leaf has landed and the camera has stopped. */
export function openingMs(): number {
  const lastStart = OPENING.riffleAtMs + OPENING.sheets * OPENING.sheetGapMs;
  return Math.max(
    lastStart + OPENING.lastSheetMs,
    OPENING.cameraAtMs + OPENING.cameraMs,
  );
}

export interface LeafTiming {
  readonly delayMs: number;
  readonly durationMs: number;
}

export interface LeafVisibility {
  readonly showAtMs: number;
  /** Undefined: stays to the end, as the frontispiece's leaf does. */
  readonly hideAtMs: number | undefined;
}

/**
 * When each leaf can be seen. A leaf waiting on the right is hidden under the
 * one above until that one lifts; once landed on the left it is hidden again
 * as soon as the next one lands on it. Drawing only these few keeps the stack
 * from being composited eight layers deep, every frame.
 */
export function leafVisibility(
  leaves: readonly LeafTiming[],
): readonly LeafVisibility[] {
  return leaves.map((_, index) => {
    const above = leaves[index - 1];
    const next = leaves[index + 1];
    return {
      showAtMs: above ? above.delayMs : 0,
      hideAtMs: next ? next.delayMs + next.durationMs : undefined,
    };
  });
}
