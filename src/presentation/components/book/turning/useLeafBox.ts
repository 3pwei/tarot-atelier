"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import type { LeafBox } from "@/presentation/components/book/turning/PageTurn";

/**
 * Where a turning leaf lies: over the right-hand page of the spread shown.
 * Measured whenever the layout changes or the screen resizes, before any turn
 * starts, so the turn's keyframes are ready in the stylesheet ahead of it.
 */
export function useLeafBox(
  spread: RefObject<HTMLDivElement | null>,
  facingPages: boolean,
  /** Changes whenever the spread shown is laid out anew. */
  layoutKey: string,
): LeafBox | undefined {
  const [box, setBox] = useState<LeafBox>();
  useLayoutEffect(() => {
    const measure = () => {
      const element = spread.current;
      if (!element) return;
      const half = facingPages ? element.offsetWidth / 2 : 0;
      const next = {
        left: element.offsetLeft + half,
        top: element.offsetTop,
        width: element.offsetWidth - half,
        height: element.offsetHeight,
      };
      setBox((current) =>
        current &&
        current.left === next.left &&
        current.top === next.top &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [spread, facingPages, layoutKey]);
  return box;
}
