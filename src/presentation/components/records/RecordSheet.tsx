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
import { PrintedReading } from "@/presentation/components/reading/PrintedReading";
import {
  READING_COPY,
  SOURCE_COPY,
} from "@/presentation/components/reading/readingLabels";
import { ProfessionalNote } from "@/presentation/components/reading/ProfessionalNote";

interface RecordSheetProps {
  readonly record: ReadingRecord;
  readonly registry: DeckRegistry;
  readonly headingId: string;
  /** What can be done with the round: read it again, share, delete. */
  readonly actions: ReactNode;
  /** How reading it again is going, shown above its reading. */
  readonly status?: ReactNode;
}

function caption(name: string, card: RecordedCard): string {
  return card.orientation === "reversed"
    ? `${name}・${ORIENTATION_LABELS.reversed}`
    : name;
}

/** One recorded round printed on its page: its cards, then its reading. */
export function RecordSheet({
  record,
  registry,
  headingId,
  actions,
  status,
}: RecordSheetProps) {
  const deck = registry.get(record.deckId);
  const { reading } = record;
  const positionNames = new Map(
    record.positions.flatMap((position) =>
      position.name ? [[position.index, position.name] as const] : [],
    ),
  );

  return (
    <article className="record" aria-labelledby={headingId}>
      <p className="record__meta">
        {formatRecordedAtFull(record.recordedAt)} ·{" "}
        {record.spreadName ?? HISTORY_COPY.customSpread}
      </p>
      <h2 id={headingId} className="record__question" tabIndex={-1}>
        {record.mainQuestion || HISTORY_COPY.noMainQuestion}
      </h2>

      <ol className="record__cards">
        {record.positions.map((position) => (
          <li key={position.index} className="record__position">
            <span className="record__faces">
              <span className="record__face">
                <RecordedCardFace deck={deck} card={position.primary} />
              </span>
              {position.jumper ? (
                <span className="record__face record__face--jumper">
                  <RecordedCardFace deck={deck} card={position.jumper} />
                </span>
              ) : null}
            </span>
            <span className="record__caption">
              <span className="sr-only">牌位 {position.index}：</span>
              {position.name && (
                <span className="record__position-name">{position.name}</span>
              )}
              <span className="record__card-name">
                {caption(
                  recordedCardName(deck, position.primary),
                  position.primary,
                )}
              </span>
              {position.jumper ? (
                <span className="record__card-name">
                  {ROLE_LABELS.jumper}・
                  {caption(
                    recordedCardName(deck, position.jumper),
                    position.jumper,
                  )}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>

      {actions}
      {status}
      {reading ? (
        <section
          className="reading-panel paper-surface record__reading"
          aria-label={READING_COPY.title}
        >
          <p className="reading-panel__head">
            <span className="reading-badge">
              {SOURCE_COPY[reading.source].badge}
            </span>
          </p>
          <p className="reading-disclaimer">{READING_COPY.disclaimer}</p>
          <ProfessionalNote topics={reading.sensitiveTopics} />
          <PrintedReading result={reading} positionNames={positionNames} />
        </section>
      ) : (
        <p className="record__no-reading">{HISTORY_COPY.noReading}</p>
      )}
    </article>
  );
}
