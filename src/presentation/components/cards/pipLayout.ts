import type { TarotRank } from "@/domain/deck/types";

export interface PipPosition {
  readonly x: number;
  readonly y: number;
}

export interface PipLayout {
  readonly positions: readonly PipPosition[];
  /** Glyph scale relative to the 40-unit design size of a suit glyph. */
  readonly scale: number;
}

const LEFT = 72;
const RIGHT = 128;
const CENTER = 100;

const PIP_COUNTS: Readonly<Partial<Record<TarotRank, number>>> = {
  ace: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function pairs(rows: readonly number[]): PipPosition[] {
  return rows.flatMap((y) => [
    { x: LEFT, y },
    { x: RIGHT, y },
  ]);
}

const LAYOUTS: Readonly<Record<number, PipLayout>> = {
  1: { positions: [{ x: CENTER, y: 138 }], scale: 2.1 },
  2: {
    positions: [
      { x: CENTER, y: 98 },
      { x: CENTER, y: 180 },
    ],
    scale: 1.15,
  },
  3: {
    positions: [
      { x: CENTER, y: 88 },
      { x: CENTER, y: 139 },
      { x: CENTER, y: 190 },
    ],
    scale: 1,
  },
  4: { positions: pairs([100, 178]), scale: 1 },
  5: { positions: [...pairs([96, 182]), { x: CENTER, y: 139 }], scale: 0.92 },
  6: { positions: pairs([88, 139, 190]), scale: 0.86 },
  7: {
    positions: [...pairs([88, 139, 190]), { x: CENTER, y: 113 }],
    scale: 0.8,
  },
  8: {
    positions: [
      ...pairs([88, 139, 190]),
      { x: CENTER, y: 113 },
      { x: CENTER, y: 165 },
    ],
    scale: 0.76,
  },
  9: {
    positions: [...pairs([84, 120, 158, 194]), { x: CENTER, y: 139 }],
    scale: 0.7,
  },
  10: {
    positions: [
      ...pairs([84, 120, 158, 194]),
      { x: CENTER, y: 102 },
      { x: CENTER, y: 176 },
    ],
    scale: 0.66,
  },
};

/** Returns pip positions for numbered minor cards, or undefined for courts. */
export function pipLayoutFor(
  rank: TarotRank | undefined,
): PipLayout | undefined {
  if (!rank) return undefined;
  const count = PIP_COUNTS[rank];
  return count ? LAYOUTS[count] : undefined;
}

const ROMAN: readonly [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRoman(value: number): string {
  if (!Number.isInteger(value) || value <= 0) return "0";
  let remaining = value;
  let result = "";
  for (const [amount, numeral] of ROMAN) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}

const RANK_LABELS: Readonly<Record<TarotRank, string>> = {
  ace: "ACE",
  two: "II",
  three: "III",
  four: "IV",
  five: "V",
  six: "VI",
  seven: "VII",
  eight: "VIII",
  nine: "IX",
  ten: "X",
  page: "PAGE",
  knight: "KNIGHT",
  queen: "QUEEN",
  king: "KING",
};

export function rankLabel(rank: TarotRank): string {
  return RANK_LABELS[rank];
}
