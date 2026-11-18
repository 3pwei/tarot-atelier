/**
 * Where cards sit on the spread board, in units of 1% of the board's width
 * (CSS `cqw` on the board canvas). The board is 3:2, cards are 2:3, and
 * relative coordinates map onto an inset field so a card at an edge stays
 * whole. spread-table.css lays the board out from these same numbers.
 */

/**
 * Card widths on the board, as a percentage of the board's width. A spread
 * uses the largest width up to 1.5 times the standard one at which its cards
 * crowd each other no more than at the width its layout was drawn for.
 */
export const STANDARD_SLOT_WIDTH_CQW = 14;
export const LARGEST_SLOT_WIDTH_CQW = STANDARD_SLOT_WIDTH_CQW * 1.5;
/**
 * While arranging, cards keep the smallest size: a drag never makes them grow
 * or shrink, and the layout shows its most crowded look.
 */
export const ARRANGING_SLOT_WIDTH_CQW = STANDARD_SLOT_WIDTH_CQW;
/**
 * The deck's cards on the table (the pack, the vortex and the wheel) are the
 * same size for every spread: the largest position size. A chosen card
 * changes to its position's size as it flies there.
 */
export const DECK_CARD_WIDTH_CQW = LARGEST_SLOT_WIDTH_CQW;
/** The card width the built-in layouts were drawn for (before 2026-11-08). */
export const LAYOUT_SLOT_WIDTH_CQW = 11;
/** How finely the width shrinks to make room. */
const SLOT_WIDTH_STEP_CQW = 0.5;

/** Board height as a percentage of its width (aspect ratio 3:2). */
/** The table is 3:2: its height in percent of its width. */
export const BOARD_HEIGHT_CQW = (100 * 2) / 3;
const CARD_HEIGHT_RATIO = 1.5;
/** Gap kept between an edge card and the board's edge. */
export const FIELD_MARGIN_CQW = 1.4;

export interface SlotPlacement {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

/** The four corners of a placed card, in board `cqw`. */
export function slotCorners(
  placement: SlotPlacement,
  slotWidth: number,
): readonly Point[] {
  const width = slotWidth;
  const height = slotWidth * CARD_HEIGHT_RATIO;
  const insetX = width / 2 + FIELD_MARGIN_CQW;
  const insetY = height / 2 + FIELD_MARGIN_CQW;
  const center = {
    x: insetX + placement.x * (100 - 2 * insetX),
    y: insetY + placement.y * (BOARD_HEIGHT_CQW - 2 * insetY),
  };
  const radians = (placement.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx = 0, sy = 0]) => {
    const dx = (sx * width) / 2;
    const dy = (sy * height) / 2;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  });
}

function projectedRange(corners: readonly Point[], axis: Point) {
  const values = corners.map((c) => c.x * axis.x + c.y * axis.y);
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** Separating-axis test for two rotated rectangles; touching is not overlap. */
export function cardsOverlap(
  a: SlotPlacement,
  b: SlotPlacement,
  slotWidth: number,
): boolean {
  const first = slotCorners(a, slotWidth);
  const second = slotCorners(b, slotWidth);
  const axes = [first, second].flatMap((corners) =>
    [0, 1].map((edge) => {
      const from = corners[edge] as Point;
      const to = corners[edge + 1] as Point;
      return { x: -(to.y - from.y), y: to.x - from.x };
    }),
  );
  return axes.every((axis) => {
    const p = projectedRange(first, axis);
    const q = projectedRange(second, axis);
    return p.max > q.min + 1e-9 && q.max > p.min + 1e-9;
  });
}

/** Pairs of positions (by order) whose cards overlap at `slotWidth`. */
export function overlappingPairs(
  placements: readonly SlotPlacement[],
  slotWidth: number,
): readonly string[] {
  const pairs: string[] = [];
  placements.forEach((a, i) =>
    placements.slice(i + 1).forEach((b, offset) => {
      if (cardsOverlap(a, b, slotWidth))
        pairs.push(`${i + 1}-${i + offset + 2}`);
    }),
  );
  return pairs;
}

/**
 * The card width for a spread: as large as it can be, up to
 * `LARGEST_SLOT_WIDTH_CQW`, without any two cards overlapping that do not
 * already overlap in the layout as drawn. Never smaller than the standard
 * width, which every layout already accepts.
 */
export function slotWidthFor(placements: readonly SlotPlacement[]): number {
  const drawn = new Set(overlappingPairs(placements, LAYOUT_SLOT_WIDTH_CQW));
  const crowdsMore = (width: number) =>
    overlappingPairs(placements, width).some((pair) => !drawn.has(pair));
  for (
    let width = LARGEST_SLOT_WIDTH_CQW;
    width > STANDARD_SLOT_WIDTH_CQW;
    width -= SLOT_WIDTH_STEP_CQW
  ) {
    if (!crowdsMore(width)) return width;
  }
  return STANDARD_SLOT_WIDTH_CQW;
}
