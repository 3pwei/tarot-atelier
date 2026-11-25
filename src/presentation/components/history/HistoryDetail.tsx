import type { ReactNode } from "react";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type {
  ReadingRecord,
  RecordedCard,
} from "@/domain/history/readingHistory";
import {
  ORIENTATION_LABELS,
  ROLE_LABELS,
} from "@/presentation/components/cards/cardLabels";
import {
  formatRecordedAtFull,
  HISTORY_COPY,
} from "@/presentation/components/history/historyLabels";
import {
  RecordedCardFace,
  recordedCardName,
} from "@/presentation/components/history/RecordedCardFace";
import {
  READING_COPY,
  SOURCE_COPY,
} from "@/presentation/components/reading/readingLabels";
import {
  ProfessionalNote,
  ReadingSections,
} from "@/presentation/components/reading/ReadingSections";

interface HistoryDetailProps {
  readonly record: ReadingRecord;
  readonly registry: DeckRegistry;
  readonly headingId: string;
  /** How reading this round again is going, shown above its reading. */
  readonly readingStatus?: ReactNode;
}

function cardCaption(name: string, card: RecordedCard): string {
  return card.orientation === "reversed"
    ? `${name}・${ORIENTATION_LABELS.reversed}`
    : name;
}

/** One recorded round, read-only: its cards, then its reading if any. */
export function HistoryDetail({
  record,
  registry,
  headingId,
  readingStatus,
}: HistoryDetailProps) {
  const deck = registry.get(record.deckId);
  const { reading } = record;
  const topics = reading?.sensitiveTopics ?? [];

  return (
    <article className="history-detail" aria-labelledby={headingId}>
      <p className="history-detail__meta">
        {formatRecordedAtFull(record.recordedAt)} ·{" "}
        {record.spreadName ?? HISTORY_COPY.customSpread}
      </p>
      <h3 id={headingId} className="history-detail__question">
        {record.mainQuestion || HISTORY_COPY.noMainQuestion}
      </h3>

      <ol className="history-detail__cards">
        {record.positions.map((position) => {
          const name = recordedCardName(deck, position.primary);
          return (
            <li key={position.index} className="history-position">
              <span className="history-position__index" aria-hidden="true">
                {position.index}
              </span>
              <span className="history-position__faces">
                <span className="history-position__face">
                  <RecordedCardFace deck={deck} card={position.primary} />
                </span>
                {position.jumper ? (
                  <span className="history-position__face history-position__face--jumper">
                    <RecordedCardFace deck={deck} card={position.jumper} />
                  </span>
                ) : null}
              </span>
              <span className="history-position__name">
                <span className="sr-only">牌位 {position.index}：</span>
                {cardCaption(name, position.primary)}
              </span>
              {position.jumper ? (
                <span className="history-position__jumper">
                  {ROLE_LABELS.jumper}・
                  {cardCaption(
                    recordedCardName(deck, position.jumper),
                    position.jumper,
                  )}
                </span>
              ) : null}
              <span className="history-position__question">
                {position.name && (
                  <span className="history-position__position-name">
                    {position.name}
                  </span>
                )}
                {position.question}
              </span>
            </li>
          );
        })}
      </ol>

      {readingStatus}
      {reading ? (
        <section className="history-detail__reading" aria-label="解讀">
          <p className="history-detail__reading-head">
            <span className="reading-badge">
              {SOURCE_COPY[reading.source].badge}
            </span>
          </p>
          <p className="reading-disclaimer">{READING_COPY.disclaimer}</p>
          <ProfessionalNote topics={topics} />
          <ReadingSections result={reading} display="collapsible" />
        </section>
      ) : (
        <p className="history-detail__no-reading">{HISTORY_COPY.noReading}</p>
      )}
    </article>
  );
}
