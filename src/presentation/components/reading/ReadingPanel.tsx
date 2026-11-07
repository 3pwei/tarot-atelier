"use client";

import { useId } from "react";
import type { Deck } from "@/domain/deck/deck";
import type { CardInstance } from "@/domain/deck/types";
import {
  READING_TONES,
  type CardReading,
  type ReadingResult,
} from "@/domain/reading/types";
import type { Spread } from "@/domain/spread/types";
import {
  FAILURE_MESSAGES,
  issueMessage,
  MEANING_LABELS,
  READING_COPY,
  TONE_LABELS,
  TOPIC_LABELS,
} from "@/presentation/components/reading/readingLabels";
import type { ReadingSession } from "@/presentation/components/reading/useReadingSession";

interface ReadingPanelProps {
  readonly session: ReadingSession;
  readonly deck: Deck;
  readonly spread: Spread;
  /** Every card on the table has been revealed. */
  readonly revealed: boolean;
}

function cardLabel(deck: Deck, card: CardInstance): string {
  const name = deck.getCard(card.cardId)?.name.zhHant ?? card.cardId;
  return `${name} ${card.orientation === "reversed" ? "逆位" : "正位"}`;
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
      <ol className="reading-summary__positions">
        {spread.positions.map((position) => (
          <li key={position.id}>
            <span className="reading-index" aria-hidden="true">
              {position.index}
            </span>
            <span className="reading-summary__question">
              <span className="sr-only">牌位 {position.index}：</span>
              {position.question.trim()}
            </span>
            {position.drawResult ? (
              <span className="reading-summary__cards">
                {cardLabel(deck, position.drawResult.primary)}
                {position.drawResult.jumper ? (
                  <span className="reading-summary__jumper">
                    {READING_COPY.jumper}：
                    {cardLabel(deck, position.drawResult.jumper)}
                  </span>
                ) : null}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
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
}: ReadingPanelProps) {
  const titleId = useId();
  const toneId = useId();
  const { state, build, stale } = session;
  const loading = state.status === "loading";
  const result = state.status === "ready" ? state.result : undefined;
  const topics = result?.sensitiveTopics ?? [];

  return (
    <section
      className="reading-panel"
      aria-labelledby={titleId}
      aria-busy={loading || undefined}
    >
      <header className="reading-panel__head">
        <h2 id={titleId}>{READING_COPY.title}</h2>
        <span className="reading-badge">{READING_COPY.sampleBadge}</span>
      </header>
      <p className="reading-panel__note">{READING_COPY.sourceNote}</p>

      {!revealed ? (
        <p className="reading-panel__waiting">{READING_COPY.waiting}</p>
      ) : (
        <>
          <SpreadSummary deck={deck} spread={spread} />

          <fieldset className="reading-tones" disabled={loading}>
            <legend id={toneId}>{READING_COPY.toneLegend}</legend>
            {READING_TONES.map((tone) => (
              <label key={tone} className="reading-tone">
                <input
                  type="radio"
                  name={toneId}
                  value={tone}
                  checked={session.tone === tone}
                  onChange={() => session.setTone(tone)}
                />
                <span>{TONE_LABELS[tone]}</span>
              </label>
            ))}
          </fieldset>

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
                  {READING_COPY.loading}
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
