import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { ProceduralBack } from "@/presentation/components/cards/ProceduralBack";

/** Cards rendered for the riffle; the rest of the deck is drawn as edge depth. */
export const SHUFFLE_CARD_COUNT = 10;
const MAX_EDGE_DEPTH_PX = 14;

/** Press-and-hold handlers from useHoldToShuffle. */
export interface HoldHandlers {
  readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onKeyUp: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onClick: () => void;
}

interface DeckStackProps {
  readonly remaining: number;
  readonly total: number;
  readonly canShuffle: boolean;
  /** True while the person is holding the deck down. */
  readonly holding: boolean;
  readonly label: string;
  readonly hint: string;
  readonly hold: HoldHandlers;
}

/** Stacked 1px offsets suggest the thickness of the cards still in the pack. */
function edgeShadow(remaining: number, total: number): string {
  const depth = Math.round(
    (remaining / Math.max(1, total)) * MAX_EDGE_DEPTH_PX,
  );
  const layers = Array.from({ length: depth }, (_, index) => {
    const step = index + 1;
    const tone = step % 3 === 0 ? "rgba(230, 197, 122, 0.55)" : "#d9cdb4";
    return `${step * 0.35}px ${step}px 0 ${tone}`;
  });
  return [...layers, `0 ${depth + 14}px 28px rgba(0, 0, 0, 0.55)`].join(", ");
}

/** The pack before it is fanned out: hold it down to shuffle. */
export function DeckStack({
  remaining,
  total,
  canShuffle,
  holding,
  label,
  hint,
  hold,
}: DeckStackProps) {
  const visibleCards = Math.min(SHUFFLE_CARD_COUNT, remaining);
  const style = {
    "--deck-edge": edgeShadow(remaining, total),
  } as CSSProperties;

  return (
    <div
      className="deck-stack"
      data-can-shuffle={canShuffle || undefined}
      data-holding={holding || undefined}
    >
      <button
        type="button"
        className="deck-stack__pile"
        disabled={!canShuffle && !holding}
        aria-label={label}
        style={style}
        {...hold}
      >
        {visibleCards === 0 ? (
          <span className="deck-stack__empty" aria-hidden="true">
            ✦
          </span>
        ) : (
          Array.from({ length: visibleCards }, (_, index) => {
            const isTop = index === visibleCards - 1;
            return (
              <span
                key={index}
                className="deck-stack__card"
                data-shuffle-card
                data-deck-top={isTop || undefined}
                aria-hidden="true"
              >
                <ProceduralBack label="" />
              </span>
            );
          })
        )}
      </button>
      <p className="deck-stack__hint" aria-hidden="true">
        {hint}
      </p>
    </div>
  );
}
