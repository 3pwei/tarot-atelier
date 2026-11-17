/**
 * The vortex shuffle: while the deck is held, cards lift off the pile one
 * after another, more and more of them, and circle upward in a funnel of
 * golden light, wide at the top and narrow at the bottom. Twenty cards stand
 * in for the deck, so the motion stays light; the real order is decided by
 * the pile when the shuffle completes.
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
  /** Cards circling on this ring once every card is in the air. */
  readonly cards: number;
  /**
   * How wide a card looks on this ring, in percent of the table's width:
   * larger on the wide rings at the top, smaller towards the tip.
   */
  readonly cardWidth: number;
}

export const VORTEX_TIERS: readonly VortexTier[] = Object.freeze([
  { y: 33, radius: 34, turnMs: 2_800, cards: 7, cardWidth: 9.5 },
  { y: 47, radius: 25, turnMs: 2_200, cards: 6, cardWidth: 8 },
  { y: 60, radius: 16, turnMs: 1_700, cards: 4, cardWidth: 6.5 },
  { y: 71, radius: 8, turnMs: 1_300, cards: 3, cardWidth: 5 },
]);

/** From the first card leaving the pile to the last. */
export const VORTEX_LIFT_SPAN_MS = 1_500;

/** One card's climb from the pile to its ring. */
export const VORTEX_CLIMB_MS = 550;

/**
 * How unruly the cards are: each strays from its ring's path and size, and
 * tumbles at its own angles, by up to these amounts.
 */
export const VORTEX_SCATTER = Object.freeze({
  /** Share of the ring's radius a card's own path is wider or narrower. */
  radius: 0.25,
  /** Sideways and up-and-down shift of a card's path, in percent of the table. */
  shiftX: 4,
  shiftY: 5,
  /** Share of the ring's card size a card is larger or smaller. */
  size: 0.25,
  /** Tumbling: tipped forward or back, and turned in the card's own plane. */
  pitchDeg: 55,
  rollDeg: 70,
});

/** Points of light drifting around the funnel. */
export const VORTEX_SPARK_COUNT = 24;

export interface VortexCard {
  readonly tier: number;
  /** When the card leaves the pile, after the deck is first held. */
  readonly launchMs: number;
  /**
   * How much the card shrinks in the air: its look on the ring over its size
   * on the table, where it is as large as the positions.
   */
  readonly airScale: number;
  /** Its own path's radius over its ring's. */
  readonly radiusScale: number;
  /** Its own path's shift from its ring's, in percent of the table. */
  readonly shiftX: number;
  readonly shiftY: number;
  /** How far it is tipped forward or back, and turned in its own plane. */
  readonly pitch: number;
  readonly roll: number;
  /**
   * Its turn about its upright axis when it joins the ring; it keeps turning
   * once per lap, so it is seen edge-on at the sides and only briefly face-on.
   */
  readonly spinFrom: number;
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

/**
 * Every card in the air, in the order they leave the pile. The rings fill
 * together: the n-th card goes to the ring that is furthest behind its share,
 * so each ring gains cards at its own steady pace. Launches are evenly spaced
 * over `VORTEX_LIFT_SPAN_MS`, so more and more cards are flying until all of
 * them are.
 *
 * @param tableCardWidth the cards' width on the table, in percent of its width.
 */
export function vortexCards(
  random: () => number,
  tableCardWidth: number,
): readonly VortexCard[] {
  const total = VORTEX_TIERS.reduce((sum, tier) => sum + tier.cards, 0);
  const placed = VORTEX_TIERS.map(() => 0);
  return Array.from({ length: total }, (_, order) => {
    const tier = furthestBehind(placed);
    placed[tier] = (placed[tier] ?? 0) + 1;
    const ring = VORTEX_TIERS[tier]!;
    const spread = (amount: number) => between(random, -amount, amount);
    const size = 1 + spread(VORTEX_SCATTER.size);
    return {
      tier,
      launchMs: Math.round(
        total > 1 ? (VORTEX_LIFT_SPAN_MS * order) / (total - 1) : 0,
      ),
      airScale: (ring.cardWidth * size) / tableCardWidth,
      radiusScale: 1 + spread(VORTEX_SCATTER.radius),
      shiftX: spread(VORTEX_SCATTER.shiftX),
      shiftY: spread(VORTEX_SCATTER.shiftY),
      pitch: Math.round(spread(VORTEX_SCATTER.pitchDeg)),
      roll: Math.round(spread(VORTEX_SCATTER.rollDeg)),
      spinFrom: Math.round(between(random, 0, 360)),
    };
  });
}

/** The ring with the smallest share of its cards placed so far. */
function furthestBehind(placed: readonly number[]): number {
  let behind = 0;
  VORTEX_TIERS.forEach((tier, index) => {
    const share = (placed[index] ?? 0) / tier.cards;
    const lowest = (placed[behind] ?? 0) / VORTEX_TIERS[behind]!.cards;
    if (share < lowest) behind = index;
  });
  return behind;
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
