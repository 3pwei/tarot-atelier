import { useId } from "react";
import type { BookPlace } from "@/presentation/components/book/bookPlace";
import { BookPage } from "@/presentation/components/book/BookPage";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import { ContentsPage } from "@/presentation/components/book/ContentsPage";
import { FrontispiecePage } from "@/presentation/components/book/FrontispiecePage";

interface LeafFaceProps {
  readonly place: BookPlace;
  readonly entries: readonly ContentsEntry[];
}

const STILL = () => undefined;

/**
 * The printed side of a turning leaf: a still copy of a page. The front
 * matter is drawn whole. A chapter or the appendix is blank paper while the
 * pages turn: its title appears only on the page the turn ends at, and a
 * second live table is never drawn.
 */
export function LeafFace({ place, entries }: LeafFaceProps) {
  switch (place.kind) {
    case "frontispiece":
      return <FrontispiecePage onToContents={STILL} />;
    case "contents":
      return <ContentsPage entries={entries} onOpen={STILL} />;
    case "chapter":
    case "codex":
    case "records":
    case "cover":
      return <BlankFace />;
  }
}

/**
 * A place still, as facing pages show it: the front matter on both pages,
 * a chapter or the appendix as blank paper across them.
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

function BlankFace() {
  const titleId = useId();
  return (
    <BookPage side="right" labelledBy={titleId}>
      <span id={titleId} hidden />
    </BookPage>
  );
}
