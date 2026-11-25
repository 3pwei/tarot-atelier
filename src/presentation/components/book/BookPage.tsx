import type { MouseEvent, ReactNode, Ref } from "react";
import type { PageLayout } from "@/presentation/components/book/pageLayout";

export type PageSide = "left" | "right";
export type PageWidth = "page" | "spread";

interface BookPageProps {
  readonly side: PageSide;
  /** `spread` spans both pages on a wide screen, for the table and codex. */
  readonly width?: PageWidth;
  /**
   * With facing pages, a spread page is a grid of the two pages: the running
   * head across both, the title on the left, the folio at the foot. Each
   * place sets its own parts into the grid's body (book.css).
   */
  readonly layout?: PageLayout;
  readonly labelledBy: string;
  readonly folio?: number;
  readonly children: ReactNode;
  readonly ref?: Ref<HTMLElement>;
  /**
   * A tap on the paper itself turns on. Controls on the page keep their own
   * job, and stay the way to do it by keyboard or screen reader.
   */
  readonly onPaperPress?: () => void;
}

/** One sheet of paper: its content, then the page number at the foot. */
export function BookPage({
  side,
  width = "page",
  layout = "single-page",
  labelledBy,
  folio,
  children,
  ref,
  onPaperPress,
}: BookPageProps) {
  return (
    <section
      ref={ref}
      className="book-page"
      data-side={side}
      data-wide={width === "spread" || undefined}
      data-facing={
        (width === "spread" && layout === "facing-pages") || undefined
      }
      aria-labelledby={labelledBy}
      onClick={onPaperPress && pressedPaper(onPaperPress)}
    >
      {children}
      {folio !== undefined && (
        <div className="book-folio" aria-hidden="true">
          ~ {folio} ~
        </div>
      )}
    </section>
  );
}

const CONTROLS = "button, a, input, select, textarea, label";

/** Calls `onPress` for a click that lands on the paper, not on a control. */
function pressedPaper(onPress: () => void) {
  return (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest(CONTROLS))
      return;
    onPress();
  };
}
