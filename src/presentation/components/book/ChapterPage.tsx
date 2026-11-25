"use client";

import { useCallback, useId, useState } from "react";
import { ConfirmDialog } from "@/presentation/components/dialog/ConfirmDialog";
import { DrawExperience } from "@/presentation/components/DrawExperience";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { BookPage } from "@/presentation/components/book/BookPage";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import { PageTitle } from "@/presentation/components/book/PageTitle";
import { EntryHead } from "@/presentation/components/book/EntryHead";

interface ChapterPageProps {
  readonly entry: ContentsEntry;
  readonly templateId: string;
  readonly onBack: () => void;
}

/**
 * One spread's chapter: its title, then the table laid out for it. Leaving
 * with cards still face down, or a layout half edited, asks first.
 */
export function ChapterPage({ entry, templateId, onBack }: ChapterPageProps) {
  const titleId = useId();
  const [unfinished, setUnfinished] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const handleUnfinished = useCallback(
    (value: boolean) => setUnfinished(value),
    [],
  );
  const back = () => (unfinished ? setConfirming(true) : onBack());

  return (
    <BookPage
      side="right"
      width="spread"
      labelledBy={titleId}
      folio={entry.page}
    >
      <EntryHead entry={entry} onBack={back} />
      <PageTitle
        id={titleId}
        title={entry.title}
        language={entry.titleLanguage}
      />
      <div className="book-plate">
        <DrawExperience
          templateId={templateId}
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
