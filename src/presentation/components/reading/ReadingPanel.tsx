"use client";

import { useId, type ReactNode } from "react";
import type { ReadingSource } from "@/domain/reading/types";
import {
  FAILURE_MESSAGES,
  FALLBACK_MESSAGES,
  issueMessage,
  READING_COPY,
  SOURCE_COPY,
} from "@/presentation/components/reading/readingLabels";
import {
  ProfessionalNote,
  ReadingSections,
} from "@/presentation/components/reading/ReadingSections";
import { PrintedReading } from "@/presentation/components/reading/PrintedReading";
import type { ReadingSession } from "@/presentation/components/reading/useReadingSession";
import { SHARE_COPY } from "@/presentation/components/share/shareLabels";

interface ReadingPanelProps {
  readonly session: ReadingSession;
  /** Every card on the table has been revealed. */
  readonly revealed: boolean;
  /** Where readings come from when generated: AI first, or pre-written. */
  readonly source: ReadingSource;
  /** Shares the finished round, with its reading if there is one. */
  readonly onShare: () => void;
  /**
   * `panel`: a night-sky panel under the table, its sections folding.
   * `pages`: printed on the book's pages, every section open, after
   * `heading`, the page's own title.
   */
  readonly layout?: ReadingLayout;
}

export type ReadingLayout =
  | { readonly kind: "panel" }
  | { readonly kind: "pages"; readonly heading: ReactNode };

const PANEL: ReadingLayout = Object.freeze({ kind: "panel" });

/**
 * The reading for a finished spread. It shows which deck and draws it
 * reads, labels pre-written readings as such and always carries the
 * entertainment disclaimer.
 */
export function ReadingPanel({
  session,
  revealed,
  source,
  onShare,
  layout = PANEL,
}: ReadingPanelProps) {
  const titleId = useId();
  const { state, build, stale } = session;
  const loading = state.status === "loading";
  const result = state.status === "ready" ? state.result : undefined;
  const topics = result?.sensitiveTopics ?? [];

  return (
    <section
      className={
        layout.kind === "pages"
          ? "reading-panel paper-surface"
          : "reading-panel night-surface"
      }
      data-layout={layout.kind}
      aria-labelledby={titleId}
      aria-busy={loading || undefined}
    >
      {layout.kind === "pages" && layout.heading}
      <header className="reading-panel__head">
        <h2 id={titleId}>{READING_COPY.title}</h2>
        {/* Labelled once there is a reading, by where it actually came from. */}
        {result ? (
          <span className="reading-badge">
            {SOURCE_COPY[result.source].badge}
          </span>
        ) : null}
      </header>
      <p className="reading-disclaimer">{READING_COPY.disclaimer}</p>

      {!revealed ? (
        <button type="button" className="reading-generate" disabled>
          {READING_COPY.waiting}
        </button>
      ) : (
        <>
          {build.ok ? null : (
            <ul className="reading-issues" role="alert">
              {build.issues.map((issue) => (
                <li key={JSON.stringify(issue)}>{issueMessage(issue)}</li>
              ))}
            </ul>
          )}

          <div className="reading-actions">
            {loading ? (
              <>
                <span className="reading-status" role="status">
                  {SOURCE_COPY[source].loading}
                </span>
                <button
                  type="button"
                  className="ghost-action"
                  onClick={session.cancel}
                >
                  {READING_COPY.cancel}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="reading-generate"
                disabled={!build.ok}
                onClick={session.generate}
              >
                {state.status === "idle"
                  ? READING_COPY.generate
                  : READING_COPY.regenerate}
              </button>
            )}
            <button
              type="button"
              className="ghost-action ghost-action--gold"
              disabled={loading}
              onClick={onShare}
            >
              {SHARE_COPY.open}
            </button>
            {state.status === "failed" && !stale ? (
              <>
                <span className="reading-status" role="status">
                  {FAILURE_MESSAGES[state.failure]}
                </span>
                {state.failure === "cancelled" ? null : (
                  <button
                    type="button"
                    className="ghost-action"
                    onClick={session.retry}
                  >
                    {READING_COPY.retry}
                  </button>
                )}
              </>
            ) : null}
          </div>

          {stale && result ? (
            <p className="reading-stale" role="status">
              {READING_COPY.stale}
            </p>
          ) : null}

          {result?.fallback ? (
            <p className="reading-fallback" role="status">
              {FALLBACK_MESSAGES[result.fallback.reason]}
            </p>
          ) : null}

          <ProfessionalNote topics={topics} />

          {result && layout.kind === "pages" ? (
            <PrintedReading
              result={result}
              positionNames={positionNamesOf(build)}
            />
          ) : null}
          {result && layout.kind === "panel" ? (
            <ReadingSections result={result} />
          ) : null}
        </>
      )}
    </section>
  );
}

/** The short names of the positions read, by number. */
function positionNamesOf(
  build: ReadingSession["build"],
): ReadonlyMap<number, string> {
  if (!build.ok) return new Map();
  return new Map(
    build.request.positions.flatMap((position) =>
      position.name ? [[position.index, position.name] as const] : [],
    ),
  );
}
