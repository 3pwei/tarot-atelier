/**
 * Geometry of the wheel the shuffled pile is laid on, along the bottom of the
 * table. On a wide table the whole arc fits and nothing turns; on a narrow
 * one only part of it shows, and the person turns the wheel to reach the
 * rest. Angles are in degrees; 0 is straight up.
 */

/** Horizontal room each card shows of itself, so a fingertip can find it. */
export const CARD_SPACING_PX = 13;
/** Larger cards show a little more of themselves, as a share of their width. */
export const CARD_SPACING_SHARE = 0.12;
/** How far a chosen card slides forward out of the wheel, of its height. */
export const NUDGE_SHARE = 0.08;
/**
 * The wheel's cards are as large as the positions, so the wheel lies along
 * the table's bottom edge with only this much of its top card showing.
 */
export const VISIBLE_SHARE = 0.55;
/** How far a chosen card must be pulled forward to leave the wheel. */
export const PULL_OUT_PX = 48;

export interface WheelLayout {
  readonly cardWidth: number;
  readonly cardHeight: number;
  /** How far the chosen card slides forward. */
  readonly nudge: number;
  /** Distance from the wheel's centre to each card's centre. */
  readonly radius: number;
  /** The centre, relative to the table's top left corner. */
  readonly centerX: number;
  readonly centerY: number;
  /** Angle between neighbouring cards. */
  readonly step: number;
  /** How far the wheel may turn either way; 0 when the whole arc fits. */
  readonly maxTurn: number;
}

export function wheelLayout(options: {
  readonly width: number;
  readonly height: number;
  readonly count: number;
  /** Width of every card, the same as the positions' cards, in pixels. */
  readonly cardWidth: number;
}): WheelLayout {
  const { width, height, count, cardWidth } = options;
  const cardHeight = cardWidth * 1.5;
  const radius = Math.max(260, width * 0.85);
  const spacing = Math.max(CARD_SPACING_PX, cardWidth * CARD_SPACING_SHARE);
  const step = toDegrees(spacing / radius);
  const span = Math.max(0, count - 1) * step;
  // Angles still on the table, less a card's width at either edge.
  const visibleHalf =
    toDegrees(Math.asin(Math.min(1, width / 2 / radius))) -
    toDegrees(cardWidth / radius);
  return {
    cardWidth,
    cardHeight,
    nudge: cardHeight * NUDGE_SHARE,
    radius,
    centerX: width / 2,
    // The arc's top card shows its upper part above the table's bottom edge.
    centerY: height - cardHeight * VISIBLE_SHARE + cardHeight / 2 + radius,
    step,
    maxTurn: Math.max(0, span / 2 - Math.max(0, visibleHalf)),
  };
}

/** Where the card in `slot` sits on the wheel before it turns. */
export function cardAngle(layout: WheelLayout, slot: number, count: number) {
  return (slot - (count - 1) / 2) * layout.step;
}

export function clampTurn(layout: WheelLayout, turn: number): number {
  return Math.min(layout.maxTurn, Math.max(-layout.maxTurn, turn));
}

/** The turn that brings `slot` to the top of the wheel, as far as it goes. */
export function turnToShow(
  layout: WheelLayout,
  slot: number,
  count: number,
): number {
  return clampTurn(layout, -cardAngle(layout, slot, count));
}

/** Turning by a sideways drag: the wheel's rim follows the finger. */
export function turnByDrag(
  layout: WheelLayout,
  startTurn: number,
  dragX: number,
): number {
  return clampTurn(layout, startTurn + toDegrees(dragX / layout.radius));
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
