import type {
  ReadingHistory,
  ReadingRecord,
} from "@/domain/history/readingHistory";
import {
  formatRecordedAt,
  HISTORY_COPY,
} from "@/presentation/components/history/historyLabels";

interface RecordListProps {
  readonly history: ReadingHistory;
  readonly now: Date;
  /** The record lying open beside the list, lit; none on a phone. */
  readonly selectedId: string | undefined;
  readonly onOpen: (record: ReadingRecord) => void;
}

/**
 * The rounds kept on this device, newest first, set like the contents: when,
 * what was asked, and whether it was read.
 */
export function RecordList({
  history,
  now,
  selectedId,
  onOpen,
}: RecordListProps) {
  if (history.length === 0) {
    return <p className="record-list__empty">{HISTORY_COPY.empty}</p>;
  }
  return (
    <ul className="record-list" aria-label={HISTORY_COPY.title}>
      {history.map((record) => (
        <li key={record.id}>
          <button
            type="button"
            className="record-list__entry"
            data-lit={record.id === selectedId || undefined}
            aria-current={record.id === selectedId || undefined}
            onClick={() => onOpen(record)}
          >
            <span className="record-list__when">
              {formatRecordedAt(record.recordedAt, now)}
            </span>
            <span className="record-list__question">
              {record.mainQuestion || HISTORY_COPY.noMainQuestion}
            </span>
            <span className="record-list__dots" aria-hidden="true" />
            <span className="record-list__status">
              {record.reading
                ? HISTORY_COPY.withReading
                : HISTORY_COPY.withoutReading}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
