/**
 * Opening the book: the cover glows and swings open, one leaf turns over to
 * the frontispiece, and the camera leans in. On a phone it stops with the frontispiece filling
 * the screen; on a wide screen the open book stays on the desk.
 */

export const OPENING = {
  coverAtMs: 550,
  coverMs: 600,
  /** The one leaf after the cover, whose back is the frontispiece. */
  leafAtMs: 950,
  leafMs: 700,
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
  /** Where the closed book lies when it is tapped. */
  readonly closed: BookRect;
  /**
   * Where the open book's right-hand page ends: exactly on the live page it
   * gives way to, so nothing moves or changes size when the scene fades off.
   */
  readonly book: BookRect;
  /**
   * The camera's start, from where the book ends: it is laid out at its final
   * size and starts squeezed onto the closed one, so its leaves are drawn once
   * at the size they end at. Each axis scales on its own, because a cover and
   * an open page are not the same shape.
   */
  readonly fromScaleX: number;
  readonly fromScaleY: number;
  readonly fromX: number;
  readonly fromY: number;
  /** How far the camera leans in, overall. */
  readonly zoom: number;
  /**
   * The desk leans in far less than the book: scaling a whole screen of wood
   * several times over is more than a phone's GPU can composite smoothly,
   * and once the page fills the screen the desk is out of sight anyway.
   */
  readonly deskScale: number;
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
 * The camera from the closed book to the live page. With facing pages the
 * book's right-hand page lands on the live right-hand page; on a phone its
 * left-hand page, the frontispiece, lands on the one page shown.
 */
export function openingCamera(
  viewport: Viewport,
  closed: BookRect,
  page: BookRect,
): OpeningCamera {
  const facingPages = hasFacingPages(viewport);
  const book = facingPages ? page : { ...page, left: page.left + page.width };
  const fromScaleX = closed.width / book.width;
  const fromScaleY = closed.height / book.height;
  const zoom = Math.sqrt(
    (book.width / closed.width) * (book.height / closed.height),
  );
  return {
    facingPages,
    closed,
    book,
    fromScaleX,
    fromScaleY,
    fromX: closed.left - fromScaleX * book.left,
    fromY: closed.top - fromScaleY * book.top,
    zoom,
    deskScale: deskScaleFor(zoom),
  };
}

/** When the last leaf has landed and the camera has stopped. */
export function openingMs(): number {
  return Math.max(
    OPENING.leafAtMs + OPENING.leafMs,
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
