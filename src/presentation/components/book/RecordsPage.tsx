"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type Ref,
} from "react";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type {
  ReadingHistory,
  ReadingRecord,
} from "@/domain/history/readingHistory";
import type { ReadingResult, ReadingSource } from "@/domain/reading/types";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { BookFloatButton } from "@/presentation/components/book/BookFloatButton";
import { BookPage } from "@/presentation/components/book/BookPage";
import {
  runningHeadFor,
  type ContentsEntry,
} from "@/presentation/components/book/contents";
import { EntryHead } from "@/presentation/components/book/EntryHead";
import { ClonedPage } from "@/presentation/components/book/LeafFace";
import type { PageLayout } from "@/presentation/components/book/pageLayout";
import { PageTitle } from "@/presentation/components/book/PageTitle";
import { RunningHead } from "@/presentation/components/book/RunningHead";
import type { TurnDirection } from "@/presentation/components/book/turning/turnPlan";
import type { LeafPrints } from "@/presentation/components/book/turning/usePageTurns";
import { HISTORY_COPY } from "@/presentation/components/history/historyLabels";
import { RecordReadingStatus } from "@/presentation/components/history/RecordReadingStatus";
import { useReadingHistory } from "@/presentation/components/history/useReadingHistory";
import { useRecordReading } from "@/presentation/components/history/useRecordReading";
import { ReadingSpread } from "@/presentation/components/reading/ReadingSpread";
import { useReadingServices } from "@/presentation/components/reading/useReadingServices";
import type { ReadingSession } from "@/presentation/components/reading/useReadingSession";
import { RecordList } from "@/presentation/components/records/RecordList";
import { RECORDS_COPY } from "@/presentation/components/records/recordsCopy";
import { RecordSheet } from "@/presentation/components/records/RecordSheet";
import { ShareDialog } from "@/presentation/components/share/ShareDialog";
import { SHARE_COPY } from "@/presentation/components/share/shareLabels";
import { useAtelierServices } from "@/presentation/services/atelierServices";

interface RecordsPageProps {
  readonly entry: ContentsEntry;
  readonly layout: PageLayout;
  /** Turns one leaf within the records: to a record, or on through it. */
  readonly turnLeaf: (direction: TurnDirection, prints: LeafPrints) => void;
  /** That leaf is turning: the pages keep what they show until it lands. */
  readonly leafTurning: boolean;
  readonly onBack: () => void;
  /** The clock for "today" and "yesterday" in the list, e.g. fixed in tests. */
  readonly now?: () => Date;
}

/**
 * What the records' pages show: on a phone the list or one record, a leaf
 * apart; on facing pages always both, and which spread of the record.
 */
interface RecordsView {
  readonly view: "list" | "record";
  readonly page: number;
}

const LIST: RecordsView = Object.freeze({ view: "list", page: 0 });
const FIRST_OF_RECORD: RecordsView = Object.freeze({ view: "record", page: 0 });

/** What deleting removes: the record open, or every record. */
type Deletion = "record" | "all";

/** What the pages' controls do; a still copy's do nothing. */
interface RecordsActions {
  readonly back: () => void;
  readonly openRecord: (record: ReadingRecord) => void;
  readonly toList: () => void;
  readonly showPage: (page: number) => void;
  readonly read: () => void;
  readonly share: () => void;
  readonly ask: (deletion: Deletion) => void;
  readonly cancel: () => void;
  readonly confirm: () => void;
}

const STILL = () => undefined;
const STILL_ACTIONS: RecordsActions = Object.freeze({
  back: STILL,
  openRecord: STILL,
  toList: STILL,
  showPage: STILL,
  read: STILL,
  share: STILL,
  ask: STILL,
  cancel: STILL,
  confirm: STILL,
});

/**
 * The appendix of past rounds, printed in the book: the list of rounds kept
 * on this device, and one round with its cards and reading. On facing pages
 * the list is on the left and the round open on the right; on a phone a
 * round lies a leaf after the list.
 */
export function RecordsPage({
  entry,
  layout,
  turnLeaf,
  leafTurning,
  onBack,
  now = currentTime,
}: RecordsPageProps) {
  const titleId = useId();
  const recordHeadingId = useId();
  const printedTitleId = useId();
  const printedRecordHeadingId = useId();
  const { registry, historyStorage, share } = useAtelierServices();
  const [notice, setNotice] = useState("");
  const history = useReadingHistory(historyStorage, setNotice);
  const { recordServices } = useReadingServices();
  // One clock reading per visit, so 今天/昨天 stay consistent in the list.
  const [listedAt] = useState(() => now());
  const facing = layout === "facing-pages";

  // The round open: the one chosen, or on facing pages the newest.
  const [chosenId, setChosenId] = useState<string>();
  const chosen = history.history.find((record) => record.id === chosenId);
  const record = chosen ?? (facing ? history.history[0] : undefined);

  // Where the reader turned to, and what the pages show: the same, once
  // the leaf has landed.
  const [turnedTo, setTurnedTo] = useState<RecordsView>(LIST);
  const [shown, setShown] = useState<RecordsView>(LIST);
  if (!leafTurning && shown !== turnedTo) setShown(turnedTo);

  const [deletion, setDeletion] = useState<Deletion>();
  const [sharing, setSharing] = useState<ReadingRecord>();

  const attach = history.attach;
  const storeReading = useCallback(
    (target: ReadingRecord, reading: ReadingResult) =>
      attach(target.roundKey, { mainQuestion: target.mainQuestion, reading }),
    [attach],
  );
  const recordReading = useRecordReading({
    record,
    registry,
    services: recordServices,
    onReading: storeReading,
  });
  const generating = recordReading.state.status === "loading";

  // What every copy of the pages shares, live or still.
  const spread: SharedSpread = {
    entry,
    layout,
    record,
    history: history.history,
    listedAt,
    notice,
    deletion,
    generating,
    session: recordReading,
    source: recordServices.source,
    registry,
  };

  const page = useRef<HTMLElement>(null);
  const turnTo = (next: RecordsView) => {
    const live = page.current?.cloneNode(true);
    turnLeaf(orderOf(next) > orderOf(turnedTo) ? "forward" : "back", {
      leaving: live && <ClonedPage source={live} />,
      arriving: (
        <RecordsSpread
          {...spread}
          view={next}
          controls={STILL_ACTIONS}
          titleId={printedTitleId}
          recordHeadingId={printedRecordHeadingId}
        />
      ),
    });
    setTurnedTo(next);
  };
  // Changing what is shown without a leaf: choosing on facing pages, or
  // after a deletion.
  const showAtOnce = (next: RecordsView) => {
    setTurnedTo(next);
    setShown(next);
  };

  const actions: RecordsActions = {
    back: onBack,
    openRecord: (opened) => {
      setChosenId(opened.id);
      setDeletion(undefined);
      if (facing) showAtOnce(FIRST_OF_RECORD);
      else turnTo(FIRST_OF_RECORD);
    },
    toList: () => {
      setDeletion(undefined);
      turnTo(LIST);
    },
    showPage: (next) => turnTo({ view: "record", page: next }),
    read: recordReading.generate,
    share: () => setSharing(record),
    ask: setDeletion,
    cancel: () => setDeletion(undefined),
    confirm: () => {
      if (deletion === "record" && record) history.remove(record.id);
      if (deletion === "all") history.clearAll();
      setDeletion(undefined);
      setChosenId(undefined);
      showAtOnce(LIST);
    },
  };

  // After a leaf turns within the records, the heading of what it turned to
  // has the focus, as after any turn.
  const turnedWithin = useRef(false);
  useEffect(() => {
    if (!turnedWithin.current) {
      turnedWithin.current = true;
      return;
    }
    const heading = shown.view === "list" ? titleId : recordHeadingId;
    document.getElementById(heading)?.focus({ preventScroll: true });
  }, [shown.view, titleId, recordHeadingId]);

  return (
    <>
      <RecordsSpread
        {...spread}
        ref={page}
        view={shown}
        controls={actions}
        titleId={titleId}
        recordHeadingId={recordHeadingId}
      />
      {sharing && (
        <ShareDialog
          record={sharing}
          registry={registry}
          services={share}
          onClose={() => setSharing(undefined)}
        />
      )}
    </>
  );
}

interface SharedSpread {
  readonly entry: ContentsEntry;
  readonly layout: PageLayout;
  readonly record: ReadingRecord | undefined;
  readonly history: ReadingHistory;
  readonly listedAt: Date;
  readonly notice: string;
  readonly deletion: Deletion | undefined;
  readonly generating: boolean;
  readonly session: ReadingSession;
  readonly source: ReadingSource;
  readonly registry: DeckRegistry;
}

interface RecordsSpreadProps extends SharedSpread {
  readonly view: RecordsView;
  readonly controls: RecordsActions;
  readonly titleId: string;
  readonly recordHeadingId: string;
  readonly ref?: Ref<HTMLElement>;
}

/** The records' pages as a view sets them, live or as a still copy. */
function RecordsSpread({
  entry,
  layout,
  record,
  history,
  listedAt,
  notice,
  deletion,
  generating,
  session,
  source,
  registry,
  view,
  controls,
  titleId,
  recordHeadingId,
  ref,
}: RecordsSpreadProps) {
  const facing = layout === "facing-pages";
  const listShown = facing || view.view === "list";
  const recordShown =
    record !== undefined && (facing || view.view === "record");
  const sheet = record && (
    <RecordSheet
      record={record}
      registry={registry}
      headingId={recordHeadingId}
      actions={
        <RecordActions
          record={record}
          deletion={deletion === "record"}
          generating={generating}
          canRead={session.build.ok}
          controls={controls}
        />
      }
      status={<RecordReadingStatus session={session} source={source} />}
    />
  );
  return (
    <BookPage
      ref={ref}
      side="right"
      width="spread"
      layout={layout}
      labelledBy={listShown ? titleId : recordHeadingId}
      folio={entry.page}
    >
      {listShown ? (
        <EntryHead entry={entry} onBack={controls.back} />
      ) : (
        <RunningHead
          label={runningHeadFor(entry)}
          action={
            <BookFloatButton
              label={RECORDS_COPY.toListLabel}
              onPress={controls.toList}
            >
              <span lang="en">{RECORDS_COPY.toList}</span>
            </BookFloatButton>
          }
        />
      )}
      {listShown && (
        <PageTitle
          id={titleId}
          title={BOOK_COPY.recordsHeading}
          language="en"
        />
      )}
      <div className="records paper-surface" data-layout={layout}>
        {listShown && (
          <div className="records__list">
            <p className="book-hint" role="status">
              {notice}
            </p>
            <RecordList
              history={history}
              now={listedAt}
              selectedId={facing ? record?.id : undefined}
              onOpen={controls.openRecord}
            />
            <RecordsFoot
              count={history.length}
              confirming={deletion === "all"}
              controls={controls}
            />
          </div>
        )}
        {recordShown && (
          <div className="records__record">
            {facing ? (
              <ReadingSpread
                width="page"
                page={view.page}
                onPage={controls.showPage}
              >
                {sheet}
              </ReadingSpread>
            ) : (
              sheet
            )}
          </div>
        )}
      </div>
    </BookPage>
  );
}

/** Reading the round again, sharing it, deleting it; or asking to delete. */
function RecordActions({
  record,
  deletion,
  generating,
  canRead,
  controls,
}: {
  readonly record: ReadingRecord;
  readonly deletion: boolean;
  readonly generating: boolean;
  readonly canRead: boolean;
  readonly controls: RecordsActions;
}) {
  if (deletion) {
    return (
      <div className="record__confirm" role="alert">
        <p>{HISTORY_COPY.confirmDeleteOne}</p>
        <BookFloatButton label={HISTORY_COPY.cancel} onPress={controls.cancel}>
          <span lang="en">{RECORDS_COPY.cancel}</span>
        </BookFloatButton>
        <BookFloatButton
          label={HISTORY_COPY.confirmDelete}
          onPress={controls.confirm}
        >
          <span lang="en">{RECORDS_COPY.delete}</span>
        </BookFloatButton>
      </div>
    );
  }
  const readLabel = generating
    ? HISTORY_COPY.generating
    : record.reading
      ? HISTORY_COPY.reread
      : RECORDS_COPY.readLabel;
  return (
    <div className="record__actions">
      <BookFloatButton
        label={readLabel}
        disabled={generating || !canRead}
        onPress={controls.read}
      >
        <span lang="en">
          {generating
            ? RECORDS_COPY.reading
            : record.reading
              ? RECORDS_COPY.readAgain
              : RECORDS_COPY.read}
        </span>
      </BookFloatButton>
      <BookFloatButton
        label={SHARE_COPY.open}
        disabled={generating}
        onPress={controls.share}
      >
        <span lang="en">{BOOK_COPY.share}</span>
      </BookFloatButton>
      <BookFloatButton
        label={HISTORY_COPY.deleteOne}
        disabled={generating}
        onPress={() => controls.ask("record")}
      >
        <span lang="en">{RECORDS_COPY.delete}</span>
      </BookFloatButton>
    </div>
  );
}

/** Where the records are kept, and clearing them all, asked first. */
function RecordsFoot({
  count,
  confirming,
  controls,
}: {
  readonly count: number;
  readonly confirming: boolean;
  readonly controls: RecordsActions;
}) {
  if (confirming) {
    return (
      <div className="records__foot" role="alert">
        <p>{HISTORY_COPY.confirmDeleteAll}</p>
        <BookFloatButton label={HISTORY_COPY.cancel} onPress={controls.cancel}>
          <span lang="en">{RECORDS_COPY.cancel}</span>
        </BookFloatButton>
        <BookFloatButton
          label={HISTORY_COPY.confirmDelete}
          onPress={controls.confirm}
        >
          <span lang="en">{RECORDS_COPY.delete}</span>
        </BookFloatButton>
      </div>
    );
  }
  return (
    <div className="records__foot">
      <p>{HISTORY_COPY.deviceOnly}</p>
      {count > 0 && (
        <BookFloatButton
          label={HISTORY_COPY.deleteAll}
          onPress={() => controls.ask("all")}
        >
          <span lang="en">{RECORDS_COPY.clearAll}</span>
        </BookFloatButton>
      )}
    </div>
  );
}

/** How far into the records a view lies: the list, then a record's spreads. */
function orderOf(view: RecordsView): number {
  return view.view === "list" ? 0 : 1 + view.page;
}

function currentTime(): Date {
  return new Date();
}
