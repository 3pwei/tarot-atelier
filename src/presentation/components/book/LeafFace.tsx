import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { BookPlace } from "@/presentation/components/book/bookPlace";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import { ContentsPage } from "@/presentation/components/book/ContentsPage";
import { FrontispiecePage } from "@/presentation/components/book/FrontispiecePage";

interface LeafFaceProps {
  readonly place: BookPlace;
  readonly entries: readonly ContentsEntry[];
  /** The page-sound switch as the live contents show it. */
  readonly soundOn: boolean;
  /** The contents entry lit as the page turns, if any. */
  readonly lit?: BookPlace;
}

const STILL = () => undefined;

/**
 * The printed side of a turning leaf: a still copy of a page. The front
 * matter is drawn whole. A chapter or the appendix is blank paper while the
 * pages turn: its title appears only on the page the turn ends at, and a
 * second live table is never drawn.
 */
export function LeafFace({ place, entries, soundOn, lit }: LeafFaceProps) {
  switch (place.kind) {
    case "frontispiece":
      return <FrontispiecePage onToContents={STILL} />;
    case "contents":
      // Laid out exactly as the live page, switch and lit entry included,
      // so nothing shifts as the leaf gives way to it.
      return (
        <ContentsPage
          entries={entries}
          onOpen={STILL}
          sound={{ on: soundOn, onToggle: STILL }}
          {...(lit ? { initiallyLit: lit } : {})}
        />
      );
    case "chapter":
    case "codex":
    case "records":
    case "cover":
      return <PaperFace />;
  }
}

/**
 * The left-hand page of a place, still, as facing pages show it: the
 * frontispiece for the front matter; blank paper for a chapter or the
 * appendix, which span both pages and show their title only once a turn ends.
 */
export function LeftPageFace({ place }: LeafFaceProps) {
  return place.kind === "frontispiece" || place.kind === "contents" ? (
    <FrontispiecePage onToContents={STILL} />
  ) : (
    <PaperFace />
  );
}

/**
 * Blank paper, as light to paint as paper can be: no grain, one soft shade
 * and no torn-edge mask. It only ever moves or hides under a moving leaf, and
 * painting a full page there delayed the turn's first frame.
 */
export function PaperFace() {
  return <div className="leaf-paper" />;
}

/** Which part of a page a leaf shows: one half of a wide page, or all of it. */
export type PageHalf = "left" | "right" | "whole";

/**
 * One half of a still copy of a page that spans the open book: what a leaf
 * shows on one side. Without a copy, blank paper.
 */
export function PrintedHalf({
  page,
  half,
}: {
  readonly page: ReactNode | undefined;
  readonly half: PageHalf;
}) {
  if (page === undefined) return <PaperFace />;
  return (
    <div className="leaf-half" data-half={half}>
      {page}
    </div>
  );
}

/**
 * A still copy of a live page, cloned from its DOM: a table or codex can be
 * printed on a leaf this way without a second live instance of it.
 */
export function ClonedPage({ source }: { readonly source: Node }) {
  const holder = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = holder.current;
    if (!element) return;
    element.replaceChildren(source.cloneNode(true));
    return () => element.replaceChildren();
  }, [source]);
  return <div ref={holder} className="cloned-page" />;
}
