/**
 * The wash shuffle: cards spread over the whole table and swirl while the
 * deck is held, the way a reader washes a deck face down on the cloth. Only a
 * handful of cards stand in for the deck, so the motion stays light; the
 * real order is decided by the pile when the shuffle completes.
 */

/** Cards drawn while washing. */
export const WASH_CARD_COUNT = 24;

/** Where the pack lies and the washed cards gather, in percent of the table. */
export const PILE_CENTER = Object.freeze({ x: 50, y: 48 });

/** A point on the table in percent of its width and height, with a tilt. */
export interface WashPoint {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
}

export interface WashCard {
  /** Three stops the card wanders through, then back, in a loop. */
  readonly stops: readonly [WashPoint, WashPoint, WashPoint];
  /** One loop; cards differ so the table never moves in step. */
  readonly loopMs: number;
  /** Where the card comes to rest in the gathered pile. */
  readonly rest: WashPoint;
}

/**
 * A small deterministic generator, so a shuffle's look is reproducible in
 * tests. It only decides where cards wander, never which card is drawn.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function between(random: () => number, low: number, high: number): number {
  return low + random() * (high - low);
}

/** Keeps every card's centre on the cloth, clear of the edges. */
function pointOnTable(random: () => number): WashPoint {
  return {
    x: between(random, 10, 90),
    y: between(random, 12, 82),
    rotation: between(random, -180, 180),
  };
}

export function washPaths(
  count: number,
  random: () => number,
): readonly WashCard[] {
  return Array.from({ length: count }, () => ({
    stops: [pointOnTable(random), pointOnTable(random), pointOnTable(random)],
    loopMs: Math.round(between(random, 1_400, 2_400)),
    rest: {
      x: PILE_CENTER.x + between(random, -1.5, 1.5),
      y: PILE_CENTER.y + between(random, -1.5, 1.5),
      rotation: between(random, -8, 8),
    },
  }));
}
