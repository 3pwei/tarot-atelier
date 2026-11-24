import type { BookPlace } from "@/presentation/components/book/bookPlace";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import { hashFor } from "@/presentation/components/book/bookPlace";

/** Forward turns a leaf from right to left; back brings one from the left. */
export type TurnDirection = "forward" | "back";

/** How the book moves from one place to another. */
export type TurnPlan =
  | { readonly kind: "none" }
  | { readonly kind: "open" }
  | { readonly kind: "close" }
  | { readonly kind: "single"; readonly direction: TurnDirection }
  | { readonly kind: "riffle"; readonly direction: TurnDirection };

export interface TurnContext {
  readonly entries: readonly ContentsEntry[];
  /** On a wide screen the frontispiece and the contents face each other. */
  readonly facingPages: boolean;
}

/**
 * Where a place sits in reading order: the cover, the frontispiece, the
 * contents, then every entry of the contents in its own order.
 */
export function readingOrder(
  place: BookPlace,
  entries: readonly ContentsEntry[],
): number | undefined {
  switch (place.kind) {
    case "cover":
      return 0;
    case "frontispiece":
      return 1;
    case "contents":
      return 2;
    case "chapter":
    case "codex":
    case "records": {
      const key = hashFor(place);
      const index = entries.findIndex((entry) => hashFor(entry.place) === key);
      return index < 0 ? undefined : 3 + index;
    }
  }
}

/**
 * The turn between two places. Neighbours turn one page; anything further
 * riffles. Opening the cover has its own scene, and places on the same
 * spread of facing pages do not turn at all.
 */
export function planTurn(
  from: BookPlace,
  to: BookPlace,
  { entries, facingPages }: TurnContext,
): TurnPlan {
  if (from.kind === "cover") return to.kind === "cover" ? NONE : OPEN;
  if (to.kind === "cover") return CLOSE;
  const start = readingOrder(from, entries);
  const end = readingOrder(to, entries);
  if (start === undefined || end === undefined || start === end) return NONE;
  if (facingPages && sameSpread(start, end)) return NONE;
  const direction: TurnDirection = end > start ? "forward" : "back";
  return Math.abs(end - start) === 1
    ? { kind: "single", direction }
    : { kind: "riffle", direction };
}

const NONE: TurnPlan = Object.freeze({ kind: "none" });
const OPEN: TurnPlan = Object.freeze({ kind: "open" });
const CLOSE: TurnPlan = Object.freeze({ kind: "close" });

/** The frontispiece (1) and the contents (2) are one spread. */
function sameSpread(a: number, b: number): boolean {
  return Math.min(a, b) === 1 && Math.max(a, b) === 2;
}
