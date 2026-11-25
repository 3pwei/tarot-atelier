"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ConfirmDialog } from "@/presentation/components/dialog/ConfirmDialog";
import { DrawExperience } from "@/presentation/components/DrawExperience";
import type { TableLayout } from "@/presentation/components/draw/tableLayout";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { BookFloatButton } from "@/presentation/components/book/BookFloatButton";
import { BookPage } from "@/presentation/components/book/BookPage";
import {
  runningHeadFor,
  type ContentsEntry,
} from "@/presentation/components/book/contents";
import { PageTitle } from "@/presentation/components/book/PageTitle";
import { EntryHead } from "@/presentation/components/book/EntryHead";
import { RunningHead } from "@/presentation/components/book/RunningHead";
import type { TurnDirection } from "@/presentation/components/book/turning/turnPlan";
import type { LeafPrints } from "@/presentation/components/book/turning/usePageTurns";
import type { PrintedSpread } from "@/presentation/components/reading/ReadingSpread";

interface ChapterPageProps {
  readonly entry: ContentsEntry;
  readonly templateId: string;
  readonly layout: TableLayout;
  /** Turns one leaf within the chapter, between its table and reading. */
  readonly turnLeaf: (direction: TurnDirection, prints: LeafPrints) => void;
  /** That leaf is turning: the pages keep what they show until it lands. */
  readonly leafTurning: boolean;
  readonly onBack: () => void;
}

/**
 * One spread's chapter: its title, then the table laid out for it. With
 * facing pages the reading lies on the pages after the table, one leaf turn
 * away. Leaving with cards still face down, or a layout half edited, asks
 * first.
 */
export function ChapterPage({
  entry,
  templateId,
  layout,
  turnLeaf,
  leafTurning,
  onBack,
}: ChapterPageProps) {
  const titleId = useId();
  const printedTitleId = useId();
  const [unfinished, setUnfinished] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Which spread of the reading the reader turned to (none means the
  // table), and which the pages show: the same, once the leaf has landed.
  const [turnedTo, setTurnedTo] = useState<number>();
  const [readingPage, setReadingPage] = useState<number>();
  if (!leafTurning && readingPage !== turnedTo) setReadingPage(turnedTo);
  const handleUnfinished = useCallback(
    (value: boolean) => setUnfinished(value),
    [],
  );
  const back = () => (unfinished ? setConfirming(true) : onBack());

  // The reading's spreads as still copies of this page, for the leaf that
  // turns between them; the table, live, is never copied.
  const printed = useRef<PrintedSpread>(undefined);
  const printedPage = (page: number | undefined) => {
    const spread = page === undefined ? undefined : printed.current?.(page);
    return spread === undefined ? undefined : (
      <BookPage
        side="right"
        width="spread"
        labelledBy={printedTitleId}
        folio={entry.page}
      >
        <ReadingRunningHead entry={entry} onToCards={STILL} />
        <div className="book-chapter-table" data-layout={layout}>
          {spread}
        </div>
      </BookPage>
    );
  };

  const showReadingPage = (
    next: number | undefined,
    printedSpread?: PrintedSpread,
  ) => {
    if (printedSpread) printed.current = printedSpread;
    turnLeaf((next ?? -1) > (turnedTo ?? -1) ? "forward" : "back", {
      leaving: printedPage(turnedTo),
      arriving: printedPage(next),
    });
    setTurnedTo(next);
  };

  const reading = layout === "facing-pages" && readingPage !== undefined;

  // After a leaf turns between the table and the reading, the title has the
  // focus, as after any turn. (The reading's own spreads focus themselves.)
  const turnedWithin = useRef(false);
  useEffect(() => {
    if (!turnedWithin.current) {
      turnedWithin.current = true;
      return;
    }
    document.getElementById(titleId)?.focus({ preventScroll: true });
  }, [reading, titleId]);

  return (
    <BookPage
      side="right"
      width="spread"
      labelledBy={titleId}
      folio={entry.page}
    >
      {reading ? (
        <ReadingRunningHead
          entry={entry}
          onToCards={() => showReadingPage(undefined)}
        />
      ) : (
        <>
          <EntryHead entry={entry} onBack={back} />
          <PageTitle
            id={titleId}
            title={entry.title}
            language={entry.titleLanguage}
          />
        </>
      )}
      <div className="book-chapter-table" data-layout={layout}>
        <DrawExperience
          templateId={templateId}
          layout={layout}
          readingPages={{
            page: readingPage,
            show: showReadingPage,
            heading: (
              <PageTitle
                id={titleId}
                title={BOOK_COPY.readingTitle}
                language="en"
              />
            ),
            printedHeading: (
              <PageTitle
                id={printedTitleId}
                title={BOOK_COPY.readingTitle}
                language="en"
              />
            ),
          }}
          onUnfinishedChange={handleUnfinished}
        />
      </div>
      {confirming && (
        <ConfirmDialog
          title={BOOK_COPY.leaveTitle}
          message={BOOK_COPY.leaveMessage}
          confirmLabel={BOOK_COPY.leaveConfirm}
          onConfirm={onBack}
          onCancel={() => setConfirming(false)}
        />
      )}
    </BookPage>
  );
}

/** The reading's running head, with the way back to the cards. */
function ReadingRunningHead({
  entry,
  onToCards,
}: {
  readonly entry: ContentsEntry;
  readonly onToCards: () => void;
}) {
  return (
    <RunningHead
      label={`${runningHeadFor(entry)} · ${BOOK_COPY.readingTitle}`}
      action={
        <BookFloatButton label={BOOK_COPY.toCardsLabel} onPress={onToCards}>
          <span lang="en">{BOOK_COPY.toCards}</span>
        </BookFloatButton>
      }
    />
  );
}

/** A still copy's controls do nothing. */
const STILL = () => undefined;
