"use client";

import type { CardFan } from "@/presentation/components/draw/cardFan";
import { CardWheelView } from "@/presentation/components/draw/CardWheelView";
import {
  DeckStack,
  type HoldHandlers,
} from "@/presentation/components/draw/DeckStack";
import { TableWash } from "@/presentation/components/draw/TableWash";
import { PILE_CENTER } from "@/presentation/components/draw/tableWash";
import type { CSSProperties } from "react";

/** The pile's place reaches the stylesheet as plain numbers (cqw, cqh). */
const PILE_STYLE = {
  "--table-pile-x": PILE_CENTER.x,
  "--table-pile-y": PILE_CENTER.y,
} as CSSProperties;

interface TableDeckProps {
  readonly shuffling: boolean;
  readonly holding: boolean;
  readonly gathering: boolean;
  readonly washSeed: number;
  /** Set while the pile lies on the wheel to choose from. */
  readonly fan?: CardFan;
  /** Number of the position the next chosen card goes to. */
  readonly nextPositionIndex?: number;
  /** False once every position has its card: the rest of the deck leaves. */
  readonly onTable: boolean;
  readonly remaining: number;
  readonly total: number;
  readonly canShuffle: boolean;
  readonly label: string;
  readonly backUrl?: string;
  readonly hold: HoldHandlers;
  readonly onPick: (slot: number, origin: DOMRect) => void;
}

/**
 * Everything the deck does, on the table itself: the pack in the middle, the
 * wash across the whole cloth, and the wheel along the bottom edge to choose
 * from. It sits above the positions but outside the zoomed canvas, so it
 * stays in place while the table is zoomed or panned.
 */
export function TableDeck({
  shuffling,
  holding,
  gathering,
  washSeed,
  fan,
  nextPositionIndex,
  onTable,
  remaining,
  total,
  canShuffle,
  label,
  backUrl,
  hold,
  onPick,
}: TableDeckProps) {
  const choosing = fan !== undefined && nextPositionIndex !== undefined;
  return (
    <div
      className="table-deck"
      style={PILE_STYLE}
      data-washing={shuffling || undefined}
      data-choosing={choosing || undefined}
    >
      {shuffling && (
        <TableWash seed={washSeed} gathering={gathering} backUrl={backUrl} />
      )}
      {choosing ? (
        <CardWheelView
          fan={fan}
          backUrl={backUrl}
          positionIndex={nextPositionIndex}
          onPick={onPick}
        />
      ) : (
        // Stays mounted while washing: the held key or pointer belongs to it.
        <div
          className="table-deck__pack"
          data-own-gesture
          data-gone={onTable ? undefined : true}
        >
          <DeckStack
            remaining={remaining}
            total={total}
            canShuffle={canShuffle}
            holding={holding}
            label={label}
            backUrl={backUrl}
            hold={hold}
          />
        </div>
      )}
    </div>
  );
}
