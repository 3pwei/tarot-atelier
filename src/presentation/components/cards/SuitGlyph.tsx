import type { TarotRank, TarotSuit } from "@/domain/deck/types";
import { cardPalette } from "./cardPalette";

/**
 * Original suit emblems drawn on a 40×40 unit grid centred on the origin.
 * They inherit `fill` / `stroke` from the parent group so one palette can be
 * applied consistently across faces.
 */

function pentagramPoints(radius: number): string {
  return Array.from({ length: 5 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 4 * Math.PI) / 5;
    return `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;
  }).join(" ");
}

const PENTAGRAM = pentagramPoints(12.5);

function Wands() {
  return (
    <g>
      <rect x={-2.4} y={-20} width={4.8} height={40} rx={2.4} />
      <ellipse cx={6} cy={-11} rx={4.6} ry={2} transform="rotate(-32 6 -11)" />
      <ellipse cx={-6} cy={-2} rx={4.6} ry={2} transform="rotate(32 -6 -2)" />
      <ellipse cx={6} cy={8} rx={4.2} ry={1.8} transform="rotate(-32 6 8)" />
      <circle cx={0} cy={-21} r={3} />
    </g>
  );
}

function Cups() {
  return (
    <g>
      <ellipse cx={0} cy={-15} rx={14} ry={3.4} />
      <path d="M-14 -15 C-14 2 -6 7 -2.2 8.5 V14 H-8 Q-9 18 0 18.4 Q9 18 8 14 H2.2 V8.5 C6 7 14 2 14 -15 Z" />
    </g>
  );
}

function Swords() {
  return (
    <g>
      <path d="M0 -21 L3.8 -14 L2.6 7 H-2.6 L-3.8 -14 Z" />
      <rect x={-10.5} y={7} width={21} height={3.4} rx={1.7} />
      <rect x={-1.7} y={10.4} width={3.4} height={6.6} />
      <circle cx={0} cy={19.2} r={2.6} />
    </g>
  );
}

function Pentacles() {
  return (
    <g>
      <circle cx={0} cy={0} r={18} />
      <circle cx={0} cy={0} r={15.4} fill={cardPalette.night} />
      <polygon
        points={PENTAGRAM}
        fill="none"
        stroke={cardPalette.foil}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </g>
  );
}

const GLYPHS: Readonly<Record<TarotSuit, () => React.JSX.Element>> = {
  wands: Wands,
  cups: Cups,
  swords: Swords,
  pentacles: Pentacles,
};

export function SuitGlyph({
  suit,
  x,
  y,
  scale = 1,
}: Readonly<{ suit: TarotSuit; x: number; y: number; scale?: number }>) {
  const Glyph = GLYPHS[suit];
  return (
    <g
      className={`suit-glyph suit-glyph--${suit}`}
      transform={`translate(${x} ${y}) scale(${scale})`}
    >
      <Glyph />
    </g>
  );
}

/** Small heraldic marks that distinguish court cards above their emblem. */
export function CourtMark({
  rank,
  x,
  y,
}: Readonly<{ rank: TarotRank; x: number; y: number }>) {
  const marks: Partial<Record<TarotRank, React.JSX.Element>> = {
    page: (
      <polygon points="0,-9 2.4,-2.4 9,0 2.4,2.4 0,9 -2.4,2.4 -9,0 -2.4,-2.4" />
    ),
    knight: (
      <path d="M-10 6 L-10 -2 Q0 -12 10 -2 L10 6 L0 10 Z M-6 -1 H6 V1.4 H-6 Z" />
    ),
    queen: (
      <path d="M-13 6 L-11 -6 L-5 1 L0 -9 L5 1 L11 -6 L13 6 Z M-2.4 -12.5 a2.4 2.4 0 1 0 4.8 0 a2.4 2.4 0 1 0 -4.8 0" />
    ),
    king: (
      <path d="M-14 7 L-13 -7 L-7 -1 L-3.5 -10 L0 -3 L3.5 -10 L7 -1 L13 -7 L14 7 Z M-1.2 -16 H1.2 V-13 H4 V-11 H1.2 V-8 H-1.2 V-11 H-4 V-13 H-1.2 Z" />
    ),
  };
  const mark = marks[rank];
  if (!mark) return null;
  return (
    <g className="court-mark" transform={`translate(${x} ${y})`}>
      {mark}
    </g>
  );
}
