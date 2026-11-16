import {
  useId,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ProceduralBack } from "@/presentation/components/cards/ProceduralBack";

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
  /** The pre-rendered back; the SVG back draws it when there is none. */
  readonly backUrl?: string;
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

const HOLD_HINT =
  "按住牌堆，牌會在整張牌桌上飛舞洗牌，放開後收回中央攤開；按一下洗一輪。";

/** The pack lying on the table: hold it down to wash the cards. */
export function DeckStack({
  remaining,
  total,
  canShuffle,
  holding,
  label,
  backUrl,
  hold,
}: DeckStackProps) {
  const hintId = useId();
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
        aria-describedby={hintId}
        style={style}
        {...hold}
      >
        {remaining === 0 ? (
          <span className="deck-stack__empty" aria-hidden="true">
            ✦
          </span>
        ) : (
          <span className="deck-stack__card" data-deck-top aria-hidden="true">
            {backUrl ? (
              // A static export serves files as they are; next/image adds nothing.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="deck-stack__back"
                src={backUrl}
                alt=""
                draggable={false}
              />
            ) : (
              <ProceduralBack label="" />
            )}
          </span>
        )}
      </button>
      <span id={hintId} className="sr-only">
        {HOLD_HINT}
      </span>
    </div>
  );
}
