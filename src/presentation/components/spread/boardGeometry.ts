/**
 * Where cards sit on the spread board, in units of 1% of the board's width
 * (CSS `cqw` on the board canvas). The board is 3:2, cards are 2:3, and
 * relative coordinates map onto an inset field so a card at an edge stays
 * whole. spread-table.css lays the board out from these same numbers.
 */

/** Card width on the board, as a percentage of the board's width. */
export const SLOT_WIDTH_CQW = 14;

/** Board height as a percentage of its width (aspect ratio 3:2). */
const BOARD_HEIGHT_CQW = (100 * 2) / 3;
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
