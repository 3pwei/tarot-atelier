"use client";

import { useId, useState } from "react";
import { HistoryDialog } from "@/presentation/components/history/HistoryDialog";
import { useReadingHistory } from "@/presentation/components/history/useReadingHistory";
import { useReadingServices } from "@/presentation/components/reading/useReadingServices";
import { useAtelierServices } from "@/presentation/services/atelierServices";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { BookPage } from "@/presentation/components/book/BookPage";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import { PageTitle } from "@/presentation/components/book/PageTitle";
import { EntryHead } from "@/presentation/components/book/EntryHead";

interface RecordsPageProps {
  readonly entry: ContentsEntry;
  readonly onBack: () => void;
  /** The clock for "today" and "yesterday" in the list, e.g. fixed in tests. */
  readonly now?: () => Date;
}

/**
 * The appendix of past readings. Until it is drawn as pages of its own, it
 * opens the reading history; closing it closes the appendix too.
 */
export function RecordsPage({
  entry,
  onBack,
  now = currentTime,
}: RecordsPageProps) {
  const titleId = useId();
  const { registry, historyStorage, share } = useAtelierServices();
  const [notice, setNotice] = useState("");
  const history = useReadingHistory(historyStorage, setNotice);
  const { recordServices } = useReadingServices();

  return (
    <BookPage
      side="right"
      width="spread"
      labelledBy={titleId}
      folio={entry.page}
    >
      <EntryHead entry={entry} onBack={onBack} />
      <PageTitle id={titleId} title={BOOK_COPY.recordsHeading} language="en" />
      <p className="book-hint" role="status">
        {notice}
      </p>
      <HistoryDialog
        history={history.history}
        registry={registry}
        shareServices={share}
        readingServices={recordServices}
        onReading={history.attach}
        now={now}
        onRemove={history.remove}
        onClearAll={history.clearAll}
        onClose={onBack}
      />
    </BookPage>
  );
}

function currentTime(): Date {
  return new Date();
}
