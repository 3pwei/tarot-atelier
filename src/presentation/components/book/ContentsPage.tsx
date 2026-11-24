import { useId, useState, type MouseEvent } from "react";
import type { BookPlace } from "@/presentation/components/book/bookPlace";
import { hashFor } from "@/presentation/components/book/bookPlace";
import { BookFloatButton } from "@/presentation/components/book/BookFloatButton";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { BookPage } from "@/presentation/components/book/BookPage";
import type {
  ContentsEntry,
  ContentsSection,
} from "@/presentation/components/book/contents";
import { PageTitle } from "@/presentation/components/book/PageTitle";
import { RunningHead } from "@/presentation/components/book/RunningHead";

const CONTENTS_FOLIO = 2;

interface ContentsPageProps {
  /** Undefined until the library has been read on this device. */
  readonly entries?: readonly ContentsEntry[];
  readonly onOpen: (place: BookPlace) => void;
  /** The page-sound switch sits on the contents, where every visit passes. */
  readonly sound?: {
    readonly on: boolean;
    readonly onToggle: () => void;
  };
}

const SECTION_LABEL: Readonly<Record<ContentsSection, string>> = {
  spreads: BOOK_COPY.spreadsSection,
  appendix: BOOK_COPY.appendixSection,
};

/**
 * Page two. A tap lights an entry and a second tap on it turns there, so a
 * stray touch never whisks the reader away; keyboard Enter turns at once.
 */
export function ContentsPage({ entries, onOpen, sound }: ContentsPageProps) {
  const titleId = useId();
  const hintId = useId();
  const [lit, setLit] = useState<string>();

  const press = (entry: ContentsEntry, event: MouseEvent) => {
    const key = hashFor(entry.place);
    // A click from Enter or Space has no pointer position: detail is 0.
    const fromKeyboard = event.detail === 0;
    if (fromKeyboard || lit === key) {
      onOpen(entry.place);
      return;
    }
    setLit(key);
  };

  return (
    <BookPage side="right" labelledBy={titleId} folio={CONTENTS_FOLIO}>
      <RunningHead
        label={BOOK_COPY.contentsHead}
        action={
          sound && (
            <BookFloatButton
              label={BOOK_COPY.soundLabel}
              pressed={sound.on}
              onPress={sound.onToggle}
            >
              <span lang="en">
                {sound.on ? BOOK_COPY.soundOn : BOOK_COPY.soundOff}
              </span>
            </BookFloatButton>
          )
        }
      />
      <PageTitle id={titleId} title={BOOK_COPY.contentsTitle} language="en" />
      {entries ? (
        <ul className="book-contents" aria-describedby={hintId}>
          {entries.map((entry, index) => (
            <li key={hashFor(entry.place)}>
              {entries[index - 1]?.section !== entry.section && (
                <div
                  className="book-contents__section"
                  lang="en"
                  aria-hidden="true"
                >
                  {SECTION_LABEL[entry.section]}
                </div>
              )}
              <button
                type="button"
                className="book-contents__entry"
                data-lit={lit === hashFor(entry.place) || undefined}
                aria-label={BOOK_COPY.entryLabel(entry.title, entry.page)}
                onClick={(event) => press(entry, event)}
              >
                <span className="book-contents__numeral" lang="en">
                  {entry.numeral}
                </span>
                <span
                  className="book-contents__title"
                  lang={entry.titleLanguage}
                >
                  {entry.title}
                </span>
                <span className="book-contents__dots" />
                <span className="book-contents__page" lang="en">
                  {entry.page}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="book-hint" role="status">
          {BOOK_COPY.contentsLoading}
        </p>
      )}
      <p id={hintId} className="book-hint">
        {BOOK_COPY.contentsHint}
      </p>
    </BookPage>
  );
}
