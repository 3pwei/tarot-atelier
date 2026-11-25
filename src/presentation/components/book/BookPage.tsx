import type { ReactNode, Ref } from "react";
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
