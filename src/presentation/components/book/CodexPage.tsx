import { useId } from "react";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { BookPage } from "@/presentation/components/book/BookPage";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import { EntryHead } from "@/presentation/components/book/EntryHead";
import type { PageLayout } from "@/presentation/components/book/pageLayout";
import { PageTitle } from "@/presentation/components/book/PageTitle";
import { Codex } from "@/presentation/components/codex/Codex";

interface CodexPageProps {
  readonly entry: ContentsEntry;
  readonly layout: PageLayout;
  readonly onBack: () => void;
}

/** The appendix of every card and its meanings, printed on the page. */
export function CodexPage({ entry, layout, onBack }: CodexPageProps) {
  const titleId = useId();
  return (
    <BookPage
      side="right"
      width="spread"
      layout={layout}
      labelledBy={titleId}
      folio={entry.page}
    >
      <EntryHead entry={entry} onBack={onBack} />
      <PageTitle id={titleId} title={BOOK_COPY.codexHeading} language="en" />
      <Codex layout={layout} />
    </BookPage>
  );
}
