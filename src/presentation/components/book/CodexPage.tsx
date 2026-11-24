import { useId } from "react";
import { DeckLibrary } from "@/presentation/components/DeckLibrary";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { BookPage } from "@/presentation/components/book/BookPage";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import { PageTitle } from "@/presentation/components/book/PageTitle";
import { EntryHead } from "@/presentation/components/book/EntryHead";

interface CodexPageProps {
  readonly entry: ContentsEntry;
  readonly onBack: () => void;
}

/** The appendix of every card and its meanings. */
export function CodexPage({ entry, onBack }: CodexPageProps) {
  const titleId = useId();
  return (
    <BookPage
      side="right"
      width="spread"
      labelledBy={titleId}
      folio={entry.page}
    >
      <EntryHead entry={entry} onBack={onBack} />
      <PageTitle id={titleId} title={BOOK_COPY.codexHeading} language="en" />
      <div className="book-plate">
        <DeckLibrary />
      </div>
    </BookPage>
  );
}
