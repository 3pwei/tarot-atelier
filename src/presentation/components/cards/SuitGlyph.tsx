import type { ReactElement } from "react";
import type { TarotRank, TarotSuit } from "@/domain/deck/types";
import { INK, STAMP, starPoints } from "./inkKit";

/**
 * Original suit emblems in printed ink, drawn on a 40×40 unit grid centred on
 * the origin. They carry their own fills so they read on textured paper
 * without relying on a background-coloured cut-out.
 */

function Wands() {
  return (
    <g>
      <path d="M-2.6 20 L-1.6 -18 Q0 -22 1.6 -18 L2.6 20 Z" fill={INK} />
      <path
        d="M-2.4 -6 l-1.6 -1.4 M2.4 6 l1.6 -1.4"
        stroke={INK}
        strokeWidth={1.4}
      />
      <path d="M1.6 -12 q8 -6 9 -1 q-4 4 -9 1 z" fill={INK} />
      <path d="M-1.8 -2 q-8 -6 -9 -1 q4 4 9 1 z" fill={INK} />
      <path d="M1.8 8 q7 -5 8 -1 q-4 3 -8 1 z" fill={INK} />
    </g>
  );
}

function Cups() {
  return (
    <g>
      <path
        d="M-13 -16 H13 C13 0 6 6 2.2 7.5 V13 H7 Q8 18 0 18.5 Q-8 18 -7 13 H-2.2 V7.5 C-6 6 -13 0 -13 -16 Z"
        fill={INK}
      />
      <path d="M-10 -10 H10" stroke={STAMP} strokeWidth={1.6} />
    </g>
  );
}

function Swords() {
  return (
    <g>
      <path d="M0 -21 L3.6 -14 L2.4 7 H-2.4 L-3.6 -14 Z" fill={INK} />
      <path d="M-11 7 H11 L9.5 10.5 H-9.5 Z" fill={INK} />
      <rect x={-1.6} y={10.5} width={3.2} height={6.5} fill={INK} />
      <circle cx={0} cy={19.2} r={2.6} fill={STAMP} />
    </g>
  );
}

function Pentacles() {
  return (
    <g>
      <circle cx={0} cy={0} r={16.5} fill="none" stroke={INK} strokeWidth={3} />
      <polygon
        points={starPoints(0, 0, 12.5, 5, 5)}
        fill={STAMP}
        stroke={INK}
        strokeWidth={0.6}
      />
    </g>
  );
}

const GLYPHS: Readonly<Record<TarotSuit, () => ReactElement>> = {
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

const COURT_MARKS: Readonly<Partial<Record<TarotRank, ReactElement>>> = {
  page: <polygon points={starPoints(0, 0, 9, 3, 4)} fill={INK} />,
  knight: (
    <path
      d="M-10 8 L-10 -2 Q0 -14 10 -2 L10 8 L0 12 Z M-6 -1 H6 V1.6 H-6 Z"
      fill={INK}
      fillRule="evenodd"
    />
  ),
  queen: (
    <g fill={INK}>
      <path d="M-13 7 L-11 -6 L-5 1 L0 -9 L5 1 L11 -6 L13 7 Z" />
      <circle cx={0} cy={-13} r={2.6} fill={STAMP} />
    </g>
  ),
  king: (
    <g fill={INK}>
      <path d="M-14 8 L-13 -7 L-7 -1 L-3.5 -10 L0 -3 L3.5 -10 L7 -1 L13 -7 L14 8 Z" />
      <path
        d="M-1.4 -18 H1.4 V-15 H4.4 V-12.6 H1.4 V-9 H-1.4 V-12.6 H-4.4 V-15 H-1.4 Z"
        fill={STAMP}
      />
    </g>
  ),
};

/** Heraldic marks that set court cards apart above their emblem. */
export function CourtMark({
  rank,
  x,
  y,
}: Readonly<{ rank: TarotRank; x: number; y: number }>) {
  const mark = COURT_MARKS[rank];
  if (!mark) return null;
  return (
    <g className="court-mark" transform={`translate(${x} ${y}) scale(1.3)`}>
      {mark}
    </g>
  );
}
