"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  samePlace,
  type BookPlace,
} from "@/presentation/components/book/bookPlace";
import type { ActiveTurn } from "@/presentation/components/book/turning/usePageTurns";

/** The arriving page as laid out unseen, for the leaf to carry a copy of. */
export interface ArrivingCopy {
  readonly place: BookPlace;
  readonly page: Element;
  /** Counts changes to the page, so copies of it are taken again. */
  readonly version: number;
}

export interface ArrivingPage {
  /** The live page laid out unseen, ready for the leaf to turn to. */
  readonly staged: BookPlace | undefined;
  /** Holds the unseen page, so its laid-out page can be found. */
  readonly holder: RefObject<HTMLDivElement | null>;
  readonly copy: ArrivingCopy | undefined;
}

interface ArrivingPageOptions {
  readonly shown: BookPlace;
  readonly turn: ActiveTurn | undefined;
  /** Where the reader is about to turn, as a lit contents entry says. */
  readonly intended: BookPlace | undefined;
  /** Pages too live to copy as drawn (a table): only a clone will do. */
  readonly isLivePage: (place: BookPlace) => boolean;
}

/**
 * Lays out, unseen, the live page the reader is about to turn to (a chapter,
 * the codex, the records) and keeps a copy of it. The leaf then lands with
 * that page printed on it, and the page shows the moment the leaf lifts.
 *
 * The page is laid out before the turn, when the reader lights its entry,
 * and the copy is frozen while the leaf turns: doing either mid-turn would
 * cost the turn its frames. Turning anywhere unannounced, the leaf is blank.
 */
export function useArrivingPage({
  shown,
  turn,
  intended,
  isLivePage,
}: ArrivingPageOptions): ArrivingPage {
  const [staged, setStaged] = useState<BookPlace>();
  const before =
    intended && isLivePage(intended) && !samePlace(intended, shown)
      ? intended
      : undefined;
  // Kept through a turn to it, dropped by any other.
  const next = turn
    ? staged && samePlace(staged, turn.to) && !samePlace(turn.from, turn.to)
      ? staged
      : undefined
    : before;
  if (next !== staged) setStaged(next);

  const holder = useRef<HTMLDivElement>(null);
  const [copy, setCopy] = useState<ArrivingCopy>();
  const turning = turn !== undefined;
  useEffect(() => {
    const element = holder.current;
    if (!staged || !element || turning) return;
    let frame = 0;
    // Taken once laid out, and again whenever the page changes (its data
    // arriving, its fonts loading), until the leaf starts to turn.
    const take = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const page = element.querySelector(".book-page");
        if (page)
          setCopy((previous) => ({
            place: staged,
            page,
            version: (previous?.version ?? 0) + 1,
          }));
      });
    };
    take();
    const changes = new MutationObserver(take);
    changes.observe(element, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => {
      cancelAnimationFrame(frame);
      changes.disconnect();
    };
  }, [staged, turning]);

  return {
    staged,
    holder,
    copy: copy && staged && samePlace(copy.place, staged) ? copy : undefined,
  };
}
