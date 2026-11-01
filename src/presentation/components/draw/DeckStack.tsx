import type { CSSProperties } from "react";
import { ProceduralBack } from "@/presentation/components/cards/ProceduralBack";

/** Cards rendered for the riffle; the rest of the deck is drawn as edge depth. */
export const SHUFFLE_CARD_COUNT = 10;
const MAX_EDGE_DEPTH_PX = 14;

interface DeckStackProps {
  readonly remaining: number;
  readonly total: number;
  readonly canDraw: boolean;
  readonly label: string;
  readonly hint: string;
  readonly onDraw: () => void;
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

export function DeckStack({
  remaining,
  total,
  canDraw,
  label,
  hint,
  onDraw,
}: DeckStackProps) {
  const visibleCards = Math.min(SHUFFLE_CARD_COUNT, remaining);
  const style = {
    "--deck-edge": edgeShadow(remaining, total),
  } as CSSProperties;

  return (
    <div className="deck-stack" data-can-draw={canDraw || undefined}>
      <button
        type="button"
        className="deck-stack__pile"
        disabled={!canDraw}
        onClick={onDraw}
        aria-label={label}
        style={style}
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
