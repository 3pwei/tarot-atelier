"use client";

import { useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { ProceduralBack } from "@/presentation/components/cards/ProceduralBack";
import {
  seededRandom,
  WASH_CARD_COUNT,
  washPaths,
  type WashPoint,
} from "@/presentation/components/draw/tableWash";

interface TableWashProps {
  /** A new value gives the cards new paths: one per shuffle. */
  readonly seed: number;
  /** True once the person has let go and the cards sweep into one pile. */
  readonly gathering: boolean;
  readonly backUrl?: string;
}

/** Plain numbers: the stylesheet scales them by the table's size (cqw, cqh). */
function pointStyle(prefix: string, point: WashPoint) {
  return {
    [`--${prefix}-x`]: point.x,
    [`--${prefix}-y`]: point.y,
    [`--${prefix}-r`]: `${point.rotation}deg`,
  };
}

/**
 * Cards washed face down across the whole table while the deck is held. Each
 * wanders through its own stops on a loop of its own; when the person lets
 * go, every card sweeps from wherever it is into a pile in the middle.
 */
export function TableWash({ seed, gathering, backUrl }: TableWashProps) {
  const layer = useRef<HTMLDivElement>(null);
  const cards = useMemo(
    () => washPaths(WASH_CARD_COUNT, seededRandom(seed)),
    [seed],
  );

  // The gather starts from where each card is now, not where its loop began:
  // freeze the running animation's frame, then let the transition take over.
  useLayoutEffect(() => {
    const element = layer.current;
    if (!gathering || !element) return;
    const washed = [
      ...element.querySelectorAll<HTMLElement>("[data-wash-card]"),
    ];
    const frames = washed.map((card) => getComputedStyle(card).transform);
    washed.forEach((card, index) => {
      card.style.transform = frames[index] ?? "none";
      card.style.animation = "none";
    });
    // Commit the frozen frame, then hand over to the gathering rule: the
    // transition runs from the frozen frame to the pile.
    void element.offsetWidth;
    element.dataset.gathering = "true";
    washed.forEach((card) => card.style.removeProperty("transform"));
  }, [gathering]);

  return (
    <div ref={layer} className="table-wash" aria-hidden="true">
      {cards.map((card, index) => {
        const [first, second, third] = card.stops;
        const style = {
          ...pointStyle("wash-a", first),
          ...pointStyle("wash-b", second),
          ...pointStyle("wash-c", third),
          ...pointStyle("wash-rest", card.rest),
          "--wash-loop": `${card.loopMs}ms`,
          "--wash-order": index,
        } as CSSProperties;
        return (
          <span
            key={index}
            className="table-wash__card"
            data-wash-card
            style={style}
          >
            {backUrl ? (
              // A static export serves files as they are; next/image adds nothing.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={backUrl} alt="" draggable={false} />
            ) : (
              <ProceduralBack label="" />
            )}
          </span>
        );
      })}
    </div>
  );
}
