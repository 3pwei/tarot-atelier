import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type {
  ReadingHistory,
  ReadingRecord,
} from "@/domain/history/readingHistory";
import {
  formatRecordedAt,
  HISTORY_COPY,
} from "@/presentation/components/history/historyLabels";
import { RecordedCardFace } from "@/presentation/components/history/RecordedCardFace";

/** Enough small faces to recognise a round; the rest are counted. */
const MAX_PREVIEW_CARDS = 5;

interface HistoryListProps {
  readonly history: ReadingHistory;
  readonly registry: DeckRegistry;
  readonly now: Date;
  readonly onOpen: (id: string) => void;
}

function Entry({
  record,
  registry,
  now,
  onOpen,
}: Omit<HistoryListProps, "history"> & { readonly record: ReadingRecord }) {
  const deck = registry.get(record.deckId);
  const shown = record.positions.slice(0, MAX_PREVIEW_CARDS);
  const hidden = record.positions.length - shown.length;
  return (
    <li>
      <button
        type="button"
        className="history-entry"
        onClick={() => onOpen(record.id)}
      >
        <span className="history-entry__cards" aria-hidden="true">
          {shown.map((position) => (
            <span className="history-entry__card" key={position.index}>
              <RecordedCardFace deck={deck} card={position.primary} />
            </span>
          ))}
          {hidden > 0 ? (
            <span className="history-entry__more">+{hidden}</span>
          ) : null}
        </span>
        <span className="history-entry__text">
          <span className="history-entry__question">
            {record.mainQuestion || HISTORY_COPY.noMainQuestion}
          </span>
          <span className="history-entry__meta">
            {formatRecordedAt(record.recordedAt, now)} ·{" "}
            {record.spreadName ?? HISTORY_COPY.customSpread}
            <span
              className="history-tag"
              data-reading={record.reading ? "ready" : "none"}
            >
              {record.reading
                ? HISTORY_COPY.withReading
                : HISTORY_COPY.withoutReading}
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

/** Newest first; opening an entry shows the round as it was. */
export function HistoryList({ history, ...entry }: HistoryListProps) {
  if (history.length === 0) {
    return <p className="history-empty">{HISTORY_COPY.empty}</p>;
  }
  return (
    <ul className="history-list" aria-label={HISTORY_COPY.title}>
      {history.map((record) => (
        <Entry key={record.id} record={record} {...entry} />
      ))}
    </ul>
  );
}
