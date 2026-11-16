"use client";

import type { CardFan } from "@/presentation/components/draw/cardFan";
import { CardWheelView } from "@/presentation/components/draw/CardWheelView";
import {
  DeckStack,
  type HoldHandlers,
} from "@/presentation/components/draw/DeckStack";
import { TableWash } from "@/presentation/components/draw/TableWash";

interface TableDeckProps {
  readonly shuffling: boolean;
  readonly holding: boolean;
  readonly gathering: boolean;
  readonly washSeed: number;
  /** Set while the pile lies on the wheel to choose from. */
  readonly fan?: CardFan;
  /** Number of the position the next chosen card goes to. */
  readonly nextPositionIndex?: number;
  readonly remaining: number;
  readonly total: number;
  readonly canShuffle: boolean;
  readonly label: string;
  readonly backUrl?: string;
  readonly hold: HoldHandlers;
  readonly onPick: (slot: number, origin: DOMRect) => void;
}

/**
 * Everything the deck does, on the table itself: the pack in its corner, the
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
        <div className="table-deck__pack" data-own-gesture>
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
