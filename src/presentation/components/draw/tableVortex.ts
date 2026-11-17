/**
 * The vortex shuffle: while the deck is held, cards lift off the pile and
 * circle upward in a funnel of golden light, wide at the top and narrow at
 * the bottom. A handful of cards stand in for the deck, so the motion stays
 * light; the real order is decided by the pile when the shuffle completes.
 *
 * Every number here is a plain percentage of the table (x of its width,
 * y of its height) or a time, so the stylesheet can scale it with the table.
 */

/** Where the pack lies and the vortex gathers, in percent of the table. */
export const PILE_CENTER = Object.freeze({ x: 50, y: 48 });

/**
 * How flat each ring of the funnel looks: its height over its width. Rings
 * are drawn as ellipses, never by squashing a circle: a squashed layer is
 * redrawn on every frame and halved the frame rate on a throttled desktop.
 */
export const VORTEX_TILT = 0.3;

/** One ring of the funnel. Wider rings turn more slowly, like a whirlwind. */
export interface VortexTier {
  /** Height of the ring's centre, in percent of the table's height. */
  readonly y: number;
  /** Radius of the ring, in percent of the table's width. */
  readonly radius: number;
  /** One full turn. */
  readonly turnMs: number;
  /** Cards circling on this ring. */
  readonly cards: number;
}

export const VORTEX_TIERS: readonly VortexTier[] = Object.freeze([
  { y: 33, radius: 34, turnMs: 2_800, cards: 4 },
  { y: 47, radius: 25, turnMs: 2_200, cards: 3 },
  { y: 60, radius: 16, turnMs: 1_700, cards: 3 },
  { y: 71, radius: 8, turnMs: 1_300, cards: 2 },
]);

/** Points of light racing round each ring, ahead of the cards. */
export const VORTEX_COMETS_PER_TIER = 3;

/** Points of light drifting around the funnel. */
export const VORTEX_SPARK_COUNT = 24;

export interface VortexCard {
  readonly tier: number;
  /**
   * Where on its ring the card starts, as a time into the ring's turn, so
   * cards on one ring stay evenly spaced.
   */
  readonly offsetMs: number;
  /** A slight tilt of its own, so the cards do not look stamped. */
  readonly tilt: number;
}

export interface VortexSpark {
  readonly x: number;
  readonly y: number;
  /** Where in its twinkle the spark starts, from 0 to 1. */
  readonly phase: number;
}

/**
 * A small deterministic generator, so a shuffle's look is reproducible in
 * tests. It only decides how cards look in the air, never which is drawn.
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

export function vortexCards(random: () => number): readonly VortexCard[] {
  return VORTEX_TIERS.flatMap((tier, tierIndex) =>
    Array.from({ length: tier.cards }, (_, place) => ({
      tier: tierIndex,
      offsetMs: Math.round((tier.turnMs * place) / tier.cards),
      tilt: Math.round(between(random, -24, 24)),
    })),
  );
}

/** Sparks stay inside the funnel's outline, from its rim to its tip. */
export function vortexSparks(random: () => number): readonly VortexSpark[] {
  const top = VORTEX_TIERS[0];
  const bottom = VORTEX_TIERS[VORTEX_TIERS.length - 1];
  if (!top || !bottom) return [];
  return Array.from({ length: VORTEX_SPARK_COUNT }, () => {
    const y = between(random, top.y - 6, bottom.y + 6);
    const along = (y - top.y) / (bottom.y - top.y);
    const reach = top.radius + (bottom.radius - top.radius) * along + 4;
    return {
      x: PILE_CENTER.x + between(random, -reach, reach),
      y,
      phase: Math.round(random() * 100) / 100,
    };
  });
}
