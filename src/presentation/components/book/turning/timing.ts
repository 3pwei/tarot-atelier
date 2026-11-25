/**
 * How long each kind of turn takes, and when each sheet moves. Everything is
 * in milliseconds; CSS reads the numbers as custom properties.
 */

export const SINGLE_TURN_MS = 520;
/** Reduced motion: the new page simply fades in. */
export const REDUCED_TURN_MS = 150;

export interface SheetTiming {
  readonly delayMs: number;
  readonly durationMs: number;
}

export interface RiffleTimeline {
  /** The real leaf turns first. */
  readonly leaf: SheetTiming;
  /** Blank stand-ins follow it, one after another. */
  readonly sheets: readonly SheetTiming[];
  readonly totalMs: number;
}

const RIFFLE_MS = 900;
const RIFFLE_SHEETS = 7;

/**
 * A riffle fakes the pages in between: one real leaf, then a few opaque
 * blank sheets, each starting a little after the last, so they read as many.
 */
export function riffleTimeline(sheetCount = RIFFLE_SHEETS): RiffleTimeline {
  const leaf = { delayMs: 0, durationMs: Math.round(RIFFLE_MS * 0.45) };
  const sheets = Array.from({ length: sheetCount }, (_, index) => ({
    delayMs: Math.round(RIFFLE_MS * (0.12 + index * 0.07)),
    durationMs: Math.round(RIFFLE_MS * 0.32),
  }));
  const totalMs = Math.max(
    leaf.delayMs + leaf.durationMs,
    ...sheets.map((sheet) => sheet.delayMs + sheet.durationMs),
  );
  return { leaf, sheets, totalMs };
}

/** Played backwards, the last sheet to land is the first to lift. */
export function reversedTimeline(timeline: RiffleTimeline): RiffleTimeline {
  const flip = ({ delayMs, durationMs }: SheetTiming): SheetTiming => ({
    delayMs: timeline.totalMs - delayMs - durationMs,
    durationMs,
  });
  return {
    leaf: flip(timeline.leaf),
    sheets: timeline.sheets.map(flip),
    totalMs: timeline.totalMs,
  };
}
