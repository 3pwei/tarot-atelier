"use client";

import { useId } from "react";
import type { Deck } from "@/domain/deck/deck";
import type {
  CardReading,
  ReadingResult,
  ReadingSource,
} from "@/domain/reading/types";
import type { Spread } from "@/domain/spread/types";
import {
  FAILURE_MESSAGES,
  FALLBACK_MESSAGES,
  issueMessage,
  MEANING_LABELS,
  READING_COPY,
  SOURCE_COPY,
  TOPIC_LABELS,
} from "@/presentation/components/reading/readingLabels";
import type { ReadingSession } from "@/presentation/components/reading/useReadingSession";

interface ReadingPanelProps {
  readonly session: ReadingSession;
  readonly deck: Deck;
  readonly spread: Spread;
  /** Every card on the table has been revealed. */
  readonly revealed: boolean;
  /** Where readings come from when generated: AI first, or pre-written. */
  readonly source: ReadingSource;
}

function SpreadSummary({
  deck,
  spread,
}: Pick<ReadingPanelProps, "deck" | "spread">) {
  return (
    <div className="reading-summary">
      <dl className="reading-summary__facts">
        <div>
          <dt>{READING_COPY.deck}</dt>
          <dd>{deck.manifest.name.zhHant}</dd>
        </div>
        {spread.mainQuestion.trim() ? (
          <div>
            <dt>{READING_COPY.mainQuestion}</dt>
            <dd>{spread.mainQuestion.trim()}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function CardBlock({
  reading,
  heading,
}: {
  readonly reading: CardReading;
  readonly heading: string;
}) {
  return (
    <div className="reading-card">
      <h4>{heading}</h4>
      <p>{reading.symbolism}</p>
    </div>
  );
}

function ResultSections({ result }: { readonly result: ReadingResult }) {
  return (
    <div className="reading-result">
      {result.positions.map((position, order) => (
        <details
          key={position.index}
          className="reading-section"
          open={order === 0}
        >
          <summary>
            <span className="reading-index" aria-hidden="true">
              {position.index}
            </span>
            <span className="reading-section__title">
              <span className="sr-only">牌位 {position.index}：</span>
              {position.primary.cardName}
              <small>{MEANING_LABELS[position.primary.meaningMode]}</small>
            </span>
            <span className="reading-section__question">
              {position.question}
            </span>
          </summary>
          <CardBlock
            reading={position.primary}
            heading={READING_COPY.symbolism}
          />
          <div className="reading-card">
            <h4>{READING_COPY.interpretation}</h4>
            <p>{position.primary.interpretation}</p>
          </div>
          {position.jumper ? (
            <div className="reading-card reading-card--jumper">
              <h4>
                {READING_COPY.jumperMessage}・{position.jumper.cardName}
                <small>{MEANING_LABELS[position.jumper.meaningMode]}</small>
              </h4>
              <p>{position.jumper.symbolism}</p>
              <p>{position.jumper.interpretation}</p>
            </div>
          ) : null}
        </details>
      ))}
      <details className="reading-section">
        <summary>
          <span className="reading-section__title">
            {READING_COPY.synthesis}
          </span>
        </summary>
        <p className="reading-section__body">{result.synthesis}</p>
      </details>
      <details className="reading-section">
        <summary>
          <span className="reading-section__title">
            {READING_COPY.reflections}
          </span>
        </summary>
        <ul className="reading-list">
          {result.reflectionQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </details>
      <details className="reading-section">
        <summary>
          <span className="reading-section__title">
            {READING_COPY.suggestions}
          </span>
        </summary>
        <ul className="reading-list">
          {result.suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/**
 * The reading for a finished spread. It shows which deck and draws it
 * reads, labels pre-written readings as such and always carries the
 * entertainment disclaimer.
 */
export function ReadingPanel({
  session,
  deck,
  spread,
  revealed,
  source,
}: ReadingPanelProps) {
  const titleId = useId();
  const { state, build, stale } = session;
  const loading = state.status === "loading";
  const result = state.status === "ready" ? state.result : undefined;
  const topics = result?.sensitiveTopics ?? [];
  // A shown reading is labelled by where it actually came from.
  const copy = SOURCE_COPY[result?.source ?? source];

  return (
    <section
      className="reading-panel"
      aria-labelledby={titleId}
      aria-busy={loading || undefined}
    >
      <header className="reading-panel__head">
        <h2 id={titleId}>{READING_COPY.title}</h2>
        <span className="reading-badge">{copy.badge}</span>
      </header>
      <p className="reading-panel__note">{copy.note}</p>

      {!revealed ? (
        <p className="reading-panel__waiting">{READING_COPY.waiting}</p>
      ) : (
        <>
          <SpreadSummary deck={deck} spread={spread} />

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
                className="ghost-action ghost-action--gold"
                disabled={!build.ok}
                onClick={session.generate}
              >
                {state.status === "idle"
                  ? READING_COPY.generate
                  : READING_COPY.regenerate}
              </button>
            )}
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

          {topics.length > 0 ? (
            <p className="reading-professional" role="note">
              {READING_COPY.professional(
                topics.map((topic) => TOPIC_LABELS[topic]).join("、"),
              )}
            </p>
          ) : null}

          {result ? <ResultSections result={result} /> : null}
        </>
      )}

      <p className="reading-disclaimer">{READING_COPY.disclaimer}</p>
    </section>
  );
}
