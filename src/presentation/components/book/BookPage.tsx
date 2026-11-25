import type { ReactNode, Ref } from "react";

export type PageSide = "left" | "right";
export type PageWidth = "page" | "spread";

interface BookPageProps {
  readonly side: PageSide;
  /** `spread` spans both pages on a wide screen, for the table and codex. */
  readonly width?: PageWidth;
  readonly labelledBy: string;
  readonly folio?: number;
  readonly children: ReactNode;
  readonly ref?: Ref<HTMLElement>;
}

/** One sheet of paper: its content, then the page number at the foot. */
export function BookPage({
  side,
  width = "page",
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
