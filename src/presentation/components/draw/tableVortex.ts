/**
 * The vortex shuffle: while the deck is held, cards lift off the pile one
 * after another, more and more of them, and circle upward in a funnel of
 * golden light, wide at the top and narrow at the bottom; the widest rings
 * reach past the table's edges, where cards vanish and come back round.
 * Twenty cards stand in for the deck, so the motion stays light; the real
 * order is decided by the pile when the shuffle completes. Letting go brings
 * every card down flat onto the table, where they swirl round its middle,
 * then drop in a loose heap below, which slides away before the wheel rises.
 *
 * Every number here is a plain percentage of the table (x of its width,
 * y of its height) or a time, so the stylesheet can scale it with the table.
 */

import { BOARD_HEIGHT_CQW } from "@/presentation/components/spread/boardGeometry";

/** Where the pack lies, in percent of the table. */
export const PILE_CENTER = Object.freeze({ x: 50, y: 48 });

/** Where the loose heap lands when the deck is let go, over the wheel. */
export const HEAP_CENTER = Object.freeze({ x: 50, y: 86 });

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
   * How large a card looks on this ring, as a share of the pack's cards: a
   * little smaller towards the tip, never far from the pack's size.
   */
  readonly cardShare: number;
}

export const VORTEX_TIERS: readonly VortexTier[] = Object.freeze([
  { y: 26, radius: 56, turnMs: 3_000, cards: 7, cardShare: 0.95 },
  { y: 42, radius: 38, turnMs: 2_400, cards: 6, cardShare: 0.85 },
  { y: 57, radius: 22, turnMs: 1_800, cards: 4, cardShare: 0.75 },
  { y: 68, radius: 10, turnMs: 1_300, cards: 3, cardShare: 0.65 },
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
  shiftX: 6,
  shiftY: 8,
  /** Share of the ring's card size a card is larger or smaller. */
  size: 0.15,
  /** Turned in its own plane. */
  rollDeg: 60,
  /** Tipped away: the shortest a card may look, as a share of its height. */
  shortest: 0.55,
});

/** Where the cards lie and swirl on the table, round its middle. */
export const SETTLE = Object.freeze({
  /** Nearest and furthest from the middle, in percent of the table's width. */
  nearest: 6,
  furthest: 30,
  /** How far each card swirls round the middle, in degrees, clockwise. */
  swirlDeg: 140,
  swirlSpreadDeg: 30,
  /** Spaced by the golden angle, so no two cards line up. */
  stepRad: 2.399963,
});

/** Cards in the loose heap stray from its centre and lie askew by up to these. */
export const HEAP_SCATTER = Object.freeze({
  x: 14,
  y: 5,
  rollDeg: 28,
});

/** Soft lights circling with the cards in the air, never on the table. */
export const VORTEX_FIREFLY_COUNT = 8;

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
  /** Turned in its own plane. */
  readonly roll: number;
  /** Tipped away from the viewer: how tall it looks, as a share. */
  readonly tip: number;
  /**
   * Where in its flip the card is when it joins the ring, from 0 to 1. It
   * flips over once a lap, so the gold front shows now and then.
   */
  readonly flipPhase: number;
  /**
   * Where it lies on the table after coming down, from the middle, in
   * percent of the table's width on both axes, and turned how far.
   */
  readonly spotX: number;
  readonly spotY: number;
  readonly spotRoll: number;
  /** How far it swirls round the middle, clockwise. */
  readonly swirl: number;
  /**
   * The shift, from the middle, that takes it from where the swirl leaves it
   * to its place in the heap (percent of the table's width), and the turn
   * that leaves it askew there.
   */
  readonly heapShiftX: number;
  readonly heapShiftY: number;
  readonly heapTurn: number;
}

export interface VortexFirefly {
  readonly tier: number;
  /** How far round its ring it starts, as a time into the ring's turn. */
  readonly offsetMs: number;
  /** Its path's radius over its ring's: a little inside or outside it. */
  readonly radiusScale: number;
  /** Its size over the standard light's. */
  readonly size: number;
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function between(random: () => number, low: number, high: number): number {
  return low + random() * (high - low);
}

/**
 * Every card in the air, in the order they leave the pile. The rings fill
 * together: the n-th card goes to the ring that is furthest behind its share,
 * so each ring gains cards at its own steady pace. Launches are evenly spaced
 * over `VORTEX_LIFT_SPAN_MS`, so more and more cards are flying until all of
 * them are. Sizes are shares of the pack's card, so the vortex fits every
 * spread's card size.
 */
export function vortexCards(random: () => number): readonly VortexCard[] {
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
      airScale: ring.cardShare * size,
      radiusScale: 1 + spread(VORTEX_SCATTER.radius),
      shiftX: spread(VORTEX_SCATTER.shiftX),
      shiftY: spread(VORTEX_SCATTER.shiftY),
      roll: Math.round(spread(VORTEX_SCATTER.rollDeg)),
      tip: round2(between(random, VORTEX_SCATTER.shortest, 1)),
      flipPhase: round2(random()),
      ...settle(order, random),
    };
  });
}

/** Percent of the table's height, as percent of its width. */
const HEIGHT_SHARE = BOARD_HEIGHT_CQW / 100;

/**
 * Where the `order`-th card lies and swirls on the table and how it reaches
 * the heap. The swirl turns the card's spot round the middle, so the heap
 * shift is worked out from where the swirl leaves it.
 */
function settle(order: number, random: () => number) {
  const spread = (amount: number) => between(random, -amount, amount);
  const angle = order * SETTLE.stepRad;
  const reach = between(random, SETTLE.nearest, SETTLE.furthest);
  const spotX = reach * Math.cos(angle);
  const spotY = reach * Math.sin(angle);
  const spotRoll = Math.round((angle * 180) / Math.PI + 90 + spread(20));
  const swirl = Math.round(SETTLE.swirlDeg + spread(SETTLE.swirlSpreadDeg));
  const turned = (swirl * Math.PI) / 180;
  const heapX = HEAP_CENTER.x - 50 + spread(HEAP_SCATTER.x);
  const heapY = (HEAP_CENTER.y - 50 + spread(HEAP_SCATTER.y)) * HEIGHT_SHARE;
  const heapRoll = Math.round(spread(HEAP_SCATTER.rollDeg));
  return {
    spotX,
    spotY,
    spotRoll,
    swirl,
    heapShiftX: heapX - (spotX * Math.cos(turned) - spotY * Math.sin(turned)),
    heapShiftY: heapY - (spotX * Math.sin(turned) + spotY * Math.cos(turned)),
    heapTurn: heapRoll - swirl - spotRoll,
  };
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

/** Lights spread over the rings, top to tip, each at its own place. */
export function vortexFireflies(
  random: () => number,
): readonly VortexFirefly[] {
  return Array.from({ length: VORTEX_FIREFLY_COUNT }, (_, index) => {
    const tier = index % VORTEX_TIERS.length;
    return {
      tier,
      offsetMs: Math.round(random() * VORTEX_TIERS[tier]!.turnMs),
      radiusScale: round2(between(random, 0.8, 1.15)),
      size: round2(between(random, 0.7, 1.2)),
    };
  });
}
