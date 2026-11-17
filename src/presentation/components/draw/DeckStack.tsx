import {
  useId,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ProceduralBack } from "@/presentation/components/cards/ProceduralBack";

/** The full pack is this many 1px slices thick. */
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

/** Slices of edge under the top card: as many as the pack is thick. */
export function edgeSlices(remaining: number, total: number): number {
  return Math.round((remaining / Math.max(1, total)) * MAX_EDGE_DEPTH_PX);
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
  const slices = edgeSlices(remaining, total);
  const style = { "--slices": slices } as CSSProperties;

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
        {/* The pack's edge, slice by slice; while washing the slices leave
            one after another, so the pack thins as its cards fly off. */}
        {Array.from({ length: slices }, (_, index) => (
          <span
            key={index}
            className="deck-stack__slice"
            style={{ "--slice": index + 1 } as CSSProperties}
            aria-hidden="true"
          />
        ))}
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
