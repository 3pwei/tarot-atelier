"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { BookFloatButton } from "@/presentation/components/book/BookFloatButton";
import {
  spreadCount,
  spreadWithin,
} from "@/presentation/components/reading/readingSpreads";

/** The reading's own spreads, after the table's, with facing pages. */
export interface ReadingPages {
  /** The spread of the reading lying open; none means the table. */
  readonly page: number | undefined;
  /**
   * Turns to a spread of the reading, or back to the table. `printed`
   * draws any spread of the reading still, for the leaf that turns.
   */
  readonly show: (page: number | undefined, printed: PrintedSpread) => void;
  /** The reading's title, first in its flow. */
  readonly heading: ReactNode;
  /** The title as a still copy prints it, never taking the focus. */
  readonly printedHeading: ReactNode;
}

/** A still copy of one spread of the reading. */
export type PrintedSpread = (page: number) => ReactNode;

interface ReadingSpreadProps {
  readonly page: number;
  readonly onPage: (page: number) => void;
  readonly children: ReactNode;
}

/**
 * A reading set in two columns across the open book, never scrolled: what
 * does not fit runs on to the next spread, a leaf turn away.
 */
export function ReadingSpread({ page, onPage, children }: ReadingSpreadProps) {
  const flow = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(1);

  // The flow's columns grow as the reading arrives; count the spreads then.
  useEffect(() => {
    const element = flow.current;
    if (!element) return;
    const measure = () => {
      const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
      setCount(spreadCount(element.scrollWidth, element.clientWidth, gap));
    };
    // Without observers (an old browser, a test), count once.
    if (
      typeof ResizeObserver === "undefined" ||
      typeof MutationObserver === "undefined"
    ) {
      measure();
      return;
    }
    // Observing calls it once at the start, too.
    const resized = new ResizeObserver(measure);
    resized.observe(element);
    const changed = new MutationObserver(measure);
    changed.observe(element, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => {
      resized.disconnect();
      changed.disconnect();
    };
  }, []);

  const shown = spreadWithin(page, count);

  // Turned on to another spread, reading continues where it begins.
  const spreadWindow = useRef<HTMLDivElement>(null);
  const previouslyShown = useRef(shown);
  useEffect(() => {
    if (shown === previouslyShown.current) return;
    previouslyShown.current = shown;
    spreadWindow.current?.focus({ preventScroll: true });
  }, [shown]);

  return (
    <div className="reading-spread">
      <div
        ref={spreadWindow}
        className="reading-spread__window"
        role="group"
        tabIndex={-1}
        aria-label={BOOK_COPY.readingSpreadLabel(shown + 1, count)}
      >
        <div
          ref={flow}
          className="reading-spread__flow"
          style={{ "--reading-spread": shown } as CSSProperties}
        >
          {children}
        </div>
      </div>
      <div className="reading-spread__turns">
        {shown > 0 && (
          <BookFloatButton
            className="reading-spread__previous"
            label={BOOK_COPY.previousPageLabel}
            onPress={() => onPage(shown - 1)}
          >
            <span lang="en">{BOOK_COPY.previousPage}</span>
          </BookFloatButton>
        )}
        {shown < count - 1 && (
          <BookFloatButton
            className="reading-spread__next"
            label={BOOK_COPY.nextPageLabel}
            onPress={() => onPage(shown + 1)}
          >
            <span lang="en">{BOOK_COPY.nextPage}</span>
          </BookFloatButton>
        )}
      </div>
    </div>
  );
}
