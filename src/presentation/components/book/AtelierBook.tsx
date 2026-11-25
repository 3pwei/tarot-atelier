"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { BookCover } from "@/presentation/components/book/BookCover";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import {
  CONTENTS,
  FRONTISPIECE,
  placeBefore,
  samePlace,
  type BookPlace,
} from "@/presentation/components/book/bookPlace";
import { ChapterPage } from "@/presentation/components/book/ChapterPage";
import { CodexPage } from "@/presentation/components/book/CodexPage";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import { ContentsPage } from "@/presentation/components/book/ContentsPage";
import { FrontispiecePage } from "@/presentation/components/book/FrontispiecePage";
import { RecordsPage } from "@/presentation/components/book/RecordsPage";
import { useBookLocation } from "@/presentation/components/book/useBookLocation";
import { useContents } from "@/presentation/components/book/useContents";
import { PUBLIC_BASE_PATH } from "@/shared/config/publicBasePath";

const deskStyle = {
  "--desk-portrait": `url("${PUBLIC_BASE_PATH}/book/desk-portrait.webp")`,
  "--desk-landscape": `url("${PUBLIC_BASE_PATH}/book/desk-landscape.webp")`,
  "--book-page-edge": `url("${PUBLIC_BASE_PATH}/book/page-edge.svg")`,
} as CSSProperties;

/**
 * The whole site: a spell book on a desk. Closed at first; opened, the
 * frontispiece faces the contents, and each spread is a chapter.
 */
export function AtelierBook() {
  const { place, turnTo, replaceWith } = useBookLocation();
  const entries = useContents(place);
  const entry = entries?.find((candidate) => samePlace(candidate.place, place));
  const lost = entries !== undefined && isEntryPlace(place) && !entry;
  const root = useRef<HTMLElement>(null);
  const turned = useRef(false);

  // A link to a spread that was deleted opens the contents instead.
  useEffect(() => {
    if (lost) replaceWith(CONTENTS);
  }, [lost, replaceWith]);

  // After every turn, the new page's title takes the focus.
  useEffect(() => {
    if (!turned.current) {
      turned.current = true;
      return;
    }
    const titles =
      root.current?.querySelectorAll<HTMLElement>("[data-page-title]");
    const visible = [...(titles ?? [])].find(
      (title) => title.offsetParent !== null,
    );
    visible?.focus({ preventScroll: true });
  }, [place]);

  const back = () => turnTo(placeBefore(place));

  return (
    <main
      ref={root}
      className="atelier-book"
      style={deskStyle}
      aria-label={BOOK_COPY.bookLabel}
    >
      {renderPlace(place, entries, entry, { turnTo, back })}
    </main>
  );
}

interface Turns {
  readonly turnTo: (place: BookPlace) => void;
  readonly back: () => void;
}

function isEntryPlace(place: BookPlace): boolean {
  return (
    place.kind === "chapter" ||
    place.kind === "codex" ||
    place.kind === "records"
  );
}

function renderPlace(
  place: BookPlace,
  entries: readonly ContentsEntry[] | undefined,
  entry: ContentsEntry | undefined,
  { turnTo, back }: Turns,
) {
  switch (place.kind) {
    case "cover":
      return <BookCover onOpen={() => turnTo(FRONTISPIECE)} />;
    case "frontispiece":
    case "contents":
      return (
        <div
          className="book-spread"
          data-focus={place.kind === "frontispiece" ? "left" : "right"}
        >
          <FrontispiecePage onToContents={() => turnTo(CONTENTS)} />
          <ContentsPage {...(entries ? { entries } : {})} onOpen={turnTo} />
        </div>
      );
    case "chapter":
      return (
        entry && (
          <div className="book-spread" key={place.templateId}>
            <ChapterPage
              entry={entry}
              templateId={place.templateId}
              onBack={back}
            />
          </div>
        )
      );
    case "codex":
      return (
        entry && (
          <div className="book-spread">
            <CodexPage entry={entry} onBack={back} />
          </div>
        )
      );
    case "records":
      return (
        entry && (
          <div className="book-spread">
            <RecordsPage entry={entry} onBack={back} />
          </div>
        )
      );
  }
}
