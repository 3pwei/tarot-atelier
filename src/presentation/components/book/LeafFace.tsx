import { useId } from "react";
import {
  samePlace,
  type BookPlace,
} from "@/presentation/components/book/bookPlace";
import { BookPage } from "@/presentation/components/book/BookPage";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import { runningHeadFor } from "@/presentation/components/book/contents";
import { ContentsPage } from "@/presentation/components/book/ContentsPage";
import { FrontispiecePage } from "@/presentation/components/book/FrontispiecePage";
import { PageTitle } from "@/presentation/components/book/PageTitle";
import { RunningHead } from "@/presentation/components/book/RunningHead";

interface LeafFaceProps {
  readonly place: BookPlace;
  readonly entries: readonly ContentsEntry[];
}

const STILL = () => undefined;

/**
 * The printed side of a turning leaf: a still copy of a page. The front
 * matter is drawn whole; a chapter or the appendix shows its heading only,
 * never a second live table.
 */
export function LeafFace({ place, entries }: LeafFaceProps) {
  switch (place.kind) {
    case "frontispiece":
      return <FrontispiecePage onToContents={STILL} />;
    case "contents":
      return <ContentsPage entries={entries} onOpen={STILL} />;
    case "chapter":
    case "codex":
    case "records": {
      const entry = entries.find((candidate) =>
        samePlace(candidate.place, place),
      );
      return entry ? <HeadingFace entry={entry} /> : <BlankFace />;
    }
    case "cover":
      return <BlankFace />;
  }
}

/**
 * A place still, as facing pages show it: the front matter on both pages,
 * a chapter or the appendix across them, heading only.
 */
export function SpreadFace({ place, entries }: LeafFaceProps) {
  if (place.kind === "frontispiece" || place.kind === "contents") {
    return (
      <>
        <FrontispiecePage onToContents={STILL} />
        <ContentsPage entries={entries} onOpen={STILL} />
      </>
    );
  }
  return <LeafFace place={place} entries={entries} />;
}

function HeadingFace({ entry }: { readonly entry: ContentsEntry }) {
  const titleId = useId();
  return (
    <BookPage side="right" labelledBy={titleId} folio={entry.page}>
      <RunningHead label={runningHeadFor(entry)} />
      <PageTitle
        id={titleId}
        title={entry.title}
        language={entry.titleLanguage}
      />
    </BookPage>
  );
}

function BlankFace() {
  const titleId = useId();
  return (
    <BookPage side="right" labelledBy={titleId}>
      <span id={titleId} hidden />
    </BookPage>
  );
}
