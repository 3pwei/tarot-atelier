"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type {
  ReadingHistory,
  ReadingRecord,
} from "@/domain/history/readingHistory";
import type { ReadingResult } from "@/domain/reading/types";
import { useModalDialog } from "@/presentation/components/dialog/useModalDialog";
import { HistoryDetail } from "@/presentation/components/history/HistoryDetail";
import { HistoryList } from "@/presentation/components/history/HistoryList";
import { HISTORY_COPY } from "@/presentation/components/history/historyLabels";
import { RecordReadingStatus } from "@/presentation/components/history/RecordReadingStatus";
import {
  useRecordReading,
  type RecordReadingServices,
} from "@/presentation/components/history/useRecordReading";
import {
  SharePanel,
  type ShareServices,
} from "@/presentation/components/share/SharePanel";
import { READING_COPY } from "@/presentation/components/reading/readingLabels";
import { SHARE_COPY } from "@/presentation/components/share/shareLabels";

interface HistoryDialogProps {
  readonly history: ReadingHistory;
  readonly registry: DeckRegistry;
  readonly shareServices: ShareServices;
  readonly readingServices: RecordReadingServices;
  /** Replaces a record's reading with one just generated. */
  readonly onReading: (
    roundKey: string,
    answered: {
      readonly mainQuestion: string;
      readonly reading: ReadingResult;
    },
  ) => void;
  readonly now: () => Date;
  readonly onRemove: (id: string) => void;
  readonly onClearAll: () => void;
  readonly onClose: () => void;
}

/** What is asked before deleting: one record, or the whole history. */
type Deletion = "record" | "all";

const CONFIRM_TEXT: Readonly<Record<Deletion, string>> = {
  record: HISTORY_COPY.confirmDeleteOne,
  all: HISTORY_COPY.confirmDeleteAll,
};

/**
 * The reading history: a list of finished rounds, and one round read-only.
 * Deleting asks inside the panel, so a second dialog never stacks on top.
 */
export function HistoryDialog({
  history,
  registry,
  shareServices,
  readingServices,
  onReading,
  now,
  onRemove,
  onClearAll,
  onClose,
}: HistoryDialogProps) {
  const titleId = useId();
  const recordHeadingId = useId();
  const leadRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const modal = useModalDialog(onClose, leadRef);
  const [openId, setOpenId] = useState<string>();
  const [deletion, setDeletion] = useState<Deletion>();
  const [sharing, setSharing] = useState(false);
  const record = history.find((entry) => entry.id === openId);
  // The last record opened keeps its reading going while the list is shown;
  // opening another record drops it.
  const [readingId, setReadingId] = useState<string>();
  const readingRecord = history.find((entry) => entry.id === readingId);
  const storeReading = useCallback(
    (target: ReadingRecord, reading: ReadingResult) =>
      onReading(target.roundKey, {
        mainQuestion: target.mainQuestion,
        reading,
      }),
    [onReading],
  );
  const recordReading = useRecordReading({
    record: readingRecord,
    registry,
    services: readingServices,
    onReading: storeReading,
  });
  const readingThis = record !== undefined && record.id === readingId;
  const generating = readingThis && recordReading.state.status === "loading";
  const openRecord = (id: string) => {
    setOpenId(id);
    setReadingId(id);
  };
  // One clock reading per opening, so 今天/昨天 stay consistent in the list.
  const [listedAt] = useState(() => now());

  // The first button in the header leads each view; cancel leads a question.
  useEffect(() => {
    (deletion ? cancelRef : leadRef).current?.focus();
  }, [record, deletion, sharing]);

  const confirmDeletion = () => {
    if (deletion === "record" && record) onRemove(record.id);
    if (deletion === "all") onClearAll();
    setDeletion(undefined);
    setOpenId(undefined);
  };

  // Back from sharing returns to the record; back from a record, to the list.
  const goBack = () => {
    setDeletion(undefined);
    if (sharing) {
      setSharing(false);
    } else {
      setOpenId(undefined);
    }
  };

  return (
    <div
      className="dialog-backdrop history-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="history-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={modal.onKeyDown}
      >
        <header className="history-panel__head">
          {record ? (
            <button
              ref={leadRef}
              type="button"
              className="ghost-action"
              onClick={goBack}
            >
              ‹ {HISTORY_COPY.back}
            </button>
          ) : null}
          <h2 id={titleId} className={record ? "sr-only" : undefined}>
            {HISTORY_COPY.title}
            <small>{HISTORY_COPY.limit}</small>
          </h2>
          {record ? null : (
            <button
              ref={leadRef}
              type="button"
              className="ghost-action"
              onClick={onClose}
            >
              {HISTORY_COPY.close}
            </button>
          )}
        </header>

        <div className="history-panel__body">
          {record && sharing ? (
            <>
              <h3 className="history-panel__subtitle">{SHARE_COPY.title}</h3>
              <SharePanel
                record={record}
                registry={registry}
                services={shareServices}
              />
            </>
          ) : record ? (
            <HistoryDetail
              record={record}
              registry={registry}
              headingId={recordHeadingId}
              readingStatus={
                readingThis ? (
                  <RecordReadingStatus
                    session={recordReading}
                    source={readingServices.source}
                  />
                ) : null
              }
            />
          ) : (
            <>
              <HistoryList
                history={history}
                registry={registry}
                now={listedAt}
                onOpen={openRecord}
              />
              <p className="history-panel__note">{HISTORY_COPY.deviceOnly}</p>
            </>
          )}
        </div>

        {deletion ? (
          <footer className="history-panel__foot" role="alert">
            <p>{CONFIRM_TEXT[deletion]}</p>
            <div className="history-panel__actions">
              <button
                ref={cancelRef}
                type="button"
                className="ghost-action"
                onClick={() => setDeletion(undefined)}
              >
                {HISTORY_COPY.cancel}
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={confirmDeletion}
              >
                {HISTORY_COPY.confirmDelete}
              </button>
            </div>
          </footer>
        ) : sharing ? null : record ? (
          <footer className="history-panel__foot history-panel__foot--record">
            <button
              type="button"
              className="reading-generate"
              disabled={generating || !recordReading.build.ok}
              onClick={recordReading.generate}
            >
              {generating
                ? HISTORY_COPY.generating
                : record.reading
                  ? HISTORY_COPY.reread
                  : READING_COPY.generate}
            </button>
            <button
              type="button"
              className="ghost-action ghost-action--gold"
              disabled={generating}
              onClick={() => setSharing(true)}
            >
              {SHARE_COPY.open}
            </button>
            <button
              type="button"
              className="danger-action"
              disabled={generating}
              onClick={() => setDeletion("record")}
            >
              {HISTORY_COPY.deleteOne}
            </button>
          </footer>
        ) : history.length > 0 ? (
          <footer className="history-panel__foot">
            <button
              type="button"
              className="danger-action history-panel__delete"
              onClick={() => setDeletion("all")}
            >
              {HISTORY_COPY.deleteAll}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
