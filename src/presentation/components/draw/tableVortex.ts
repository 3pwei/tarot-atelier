/**
 * The vortex shuffle: while the deck is held, cards lift off the pile one
 * after another, more and more of them, and circle upward in a funnel of
 * golden light, wide at the top and narrow at the bottom; the widest rings
 * reach past the table's edges, where cards vanish and come back round.
 * Twenty cards stand in for the deck, so the motion stays light; the real
 * order is decided by the pile when the shuffle completes. Letting go stops
 * the whirl: every card floats down flat onto the middle of the table, then
 * they gather in a loose heap where the wheel opens.
 *
 * Every number here is a plain percentage of the table (x of its width,
 * y of its height) or a time, so the stylesheet can scale it with the table.
 */

import { BOARD_HEIGHT_CQW } from "@/presentation/components/spread/boardGeometry";

/** Where the pack lies, in percent of the table. */
export const PILE_CENTER = Object.freeze({ x: 50, y: 48 });

/** Where the cards gather when the deck is let go: where the wheel opens. */
export const HEAP_CENTER = Object.freeze({ x: 50, y: 88 });

/**
 * How flat each ring of the funnel looks: its height over its width. Rings
 * are drawn as ellipses, never by squashing a circle: a squashed layer is
 * redrawn on every frame and halved the frame rate on a throttled desktop.
 */
export const VORTEX_TILT = 0.45;

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

/**
 * The opening before the first card leaves: the table dims, the pack draws a
 * breath of light and a ring of light spreads out from it.
 */
export const VORTEX_RITUAL_MS = 900;

/** From the first card leaving the pile to the last. */
export const VORTEX_LIFT_SPAN_MS = 1_500;

/**
 * How sharply launches crowd together: the first cards leave one by one,
 * the gaps shrinking until the last ones go almost together.
 */
export const VORTEX_LAUNCH_EASE = 2;

/** One card's way from the pile to the outer ring. */
export const VORTEX_CLIMB_MS = 1_000;

/**
 * Every card is flung out to the outer ring first and then drawn in, slowly,
 * to its own: it circles there this long before it starts in.
 */
export const VORTEX_OUTER_HOLD_MS = 400;

/** How long a card takes to be drawn in from the outer ring to its own. */
export const VORTEX_DRAW_IN_MS = 1_600;

/**
 * Share of that way spent being drawn out of the pack; it must match the
 * drawn-out keyframe of `vortex-climb` (25%). From then on the card already
 * circles with its ring, so it spirals straight out into it.
 */
export const VORTEX_DRAW_OUT_SHARE = 0.25;

/**
 * How far round its ring, as a share of a lap from the near side, a card
 * joins it: the right side, heading up, so a card drawn out up and to the
 * right is carried straight on. The orbit keyframes start there.
 */
export const VORTEX_JOIN_PHASE = 0.25;

/** When a card starts circling with its ring, after the deck is first held. */
export function orbitStartMs(launchMs: number): number {
  return Math.round(launchMs + VORTEX_CLIMB_MS * VORTEX_DRAW_OUT_SHARE);
}

/**
 * How far each card is drawn out of the front of the pack, towards the
 * viewer, in card widths, before it starts circling.
 */
export const VORTEX_DRAW_OUT = 0.8;

/**
 * Cards are drawn out up and to the right at about 45°, the way the right
 * side of the rings turns: how far right a card goes for each step up the
 * table. Each card has its own angle, so no two leave in one line.
 */
export const VORTEX_DRAW_OUT_SLOPE = Object.freeze({
  least: 0.85,
  most: 1.15,
});

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

/** Where the cards come down, round the middle of the table. */
export const SETTLE = Object.freeze({
  /** Nearest and furthest from the middle, in percent of the table's width. */
  nearest: 2,
  furthest: 14,
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

/**
 * The lights come up only once the whirl is full: after the last card has
 * left the pile, not with the first ones.
 */
export const VORTEX_FIREFLY_DELAY_MS = VORTEX_RITUAL_MS + 1_600;

export interface VortexCard {
  readonly tier: number;
  /** When the card leaves the pile, after the deck is first held. */
  readonly launchMs: number;
  /**
   * How much the card shrinks in the air: its look on the ring over its size
   * on the table, the deck's size.
   */
  readonly airScale: number;
  /** Its look on the outer ring, where every card first circles. */
  readonly outerAirScale: number;
  /** The outer ring's radius over its own ring's: 1 on the outer ring. */
  readonly drawInFrom: number;
  /**
   * How far the outer ring sits above its own, in percent of the table's
   * height: 0 on the outer ring.
   */
  readonly drawInRise: number;
  /** When it starts to be drawn in to its own ring. */
  readonly drawInMs: number;
  /** How it is drawn out of the pack: rightwards per step up the table. */
  readonly drawOutSlope: number;
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
   * When, from 0 to 1, the card first starts to flip: never before it has
   * flown half a lap, and by a lap and a third at the latest. It then flips
   * every two laps, so the gold front shows now and then.
   */
  readonly flipPhase: number;
  /**
   * Where it lies on the table after coming down, from the middle, in
   * percent of the table's width on both axes, and turned how far.
   */
  readonly spotX: number;
  readonly spotY: number;
  readonly spotRoll: number;
  /**
   * The shift, from the middle, that takes it from where it lies to its place
   * in the heap (percent of the table's width), and the turn that leaves it
   * askew there.
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
 * so each ring gains cards at its own steady pace. Launches spread over
 * `VORTEX_LIFT_SPAN_MS`, far apart at first and closer and closer, so the
 * whirl builds up slowly and then fast. Sizes are shares of the pack's card, so the vortex fits every
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
    const outer = VORTEX_TIERS[0]!;
    const launchMs = launchAt(order, total);
    return {
      tier,
      launchMs,
      airScale: ring.cardShare * size,
      outerAirScale: outer.cardShare * size,
      drawInFrom: round2(outer.radius / ring.radius),
      drawInRise: outer.y - ring.y,
      drawInMs: launchMs + VORTEX_CLIMB_MS + VORTEX_OUTER_HOLD_MS,
      drawOutSlope: round2(
        between(
          random,
          VORTEX_DRAW_OUT_SLOPE.least,
          VORTEX_DRAW_OUT_SLOPE.most,
        ),
      ),
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

/**
 * After the opening, eased over the span: wide gaps first, then ever
 * narrower.
 */
export function launchAt(order: number, total: number): number {
  if (total <= 1) return VORTEX_RITUAL_MS;
  const along = order / (total - 1);
  return (
    VORTEX_RITUAL_MS +
    Math.round(VORTEX_LIFT_SPAN_MS * (1 - (1 - along) ** VORTEX_LAUNCH_EASE))
  );
}

/** Percent of the table's height, as percent of its width. */
const HEIGHT_SHARE = BOARD_HEIGHT_CQW / 100;

/** Where the `order`-th card lies on the table and how it reaches the heap. */
function settle(order: number, random: () => number) {
  const spread = (amount: number) => between(random, -amount, amount);
  const angle = order * SETTLE.stepRad;
  const reach = between(random, SETTLE.nearest, SETTLE.furthest);
  const spotX = reach * Math.cos(angle);
  const spotY = reach * Math.sin(angle);
  const spotRoll = Math.round((angle * 180) / Math.PI + 90 + spread(20));
  const heapX = HEAP_CENTER.x - 50 + spread(HEAP_SCATTER.x);
  const heapY = (HEAP_CENTER.y - 50 + spread(HEAP_SCATTER.y)) * HEIGHT_SHARE;
  const heapRoll = Math.round(spread(HEAP_SCATTER.rollDeg));
  return {
    spotX,
    spotY,
    spotRoll,
    heapShiftX: heapX - spotX,
    heapShiftY: heapY - spotY,
    heapTurn: heapRoll - spotRoll,
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

/**
 * The rotation, in degrees, of a computed CSS transform ("none" or a 2D or 3D
 * matrix): the angle its x axis is turned through.
 */
export function rotationOf(transform: string): number {
  const values = /^matrix(?:3d)?\(([^)]*)\)$/u.exec(transform.trim());
  if (!values) return 0;
  const [a = 1, b = 0] = values[1]!.split(",").map(Number);
  return (Math.atan2(b, a) * 180) / Math.PI;
}

/** The same turn as `degrees`, the short way round: within ±180°. */
export function shortestTurn(degrees: number): number {
  const turn = ((((degrees + 180) % 360) + 360) % 360) - 180;
  return Object.is(turn, -0) ? 0 : turn;
}
