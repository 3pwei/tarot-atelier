"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import type { LeafBox } from "@/presentation/components/book/turning/PageTurn";

/**
 * The right-hand page of a spread (the whole spread when one page shows),
 * where the book lays it out. Reading it lays the page out if it is not yet.
 */
export function leafBoxOf(spread: HTMLElement, facingPages: boolean): LeafBox {
  const half = facingPages ? spread.offsetWidth / 2 : 0;
  return {
    left: spread.offsetLeft + half,
    top: spread.offsetTop,
    width: spread.offsetWidth - half,
    height: spread.offsetHeight,
  };
}

/**
 * Where a turning leaf lies: over the right-hand page of the spread shown.
 * Measured whenever the layout changes or the screen resizes, before any turn
 * starts, so the turn's keyframes are ready in the stylesheet ahead of it.
 * A ResizeObserver reads it once the browser has laid the page out anyway:
 * reading it straight after a chapter's table mounts would force that whole
 * layout early, in the frame the chapter arrives.
 */
export function useLeafBox(
  spread: RefObject<HTMLDivElement | null>,
  facingPages: boolean,
  /** Changes whenever the spread shown is laid out anew. */
  layoutKey: string,
): LeafBox | undefined {
  const [box, setBox] = useState<LeafBox>();
  useLayoutEffect(() => {
    const element = spread.current;
    if (!element) return;
    const measure = () => {
      const next = leafBoxOf(element, facingPages);
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
    window.addEventListener("resize", measure);
    if (typeof ResizeObserver === "undefined") {
      measure();
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [spread, facingPages, layoutKey]);
  return box;
}
