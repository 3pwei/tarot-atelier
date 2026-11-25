"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { BookCover } from "@/presentation/components/book/BookCover";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import {
  CONTENTS,
  FRONTISPIECE,
  hashFor,
  placeBefore,
  samePlace,
  type BookPlace,
} from "@/presentation/components/book/bookPlace";
import { ChapterPage } from "@/presentation/components/book/ChapterPage";
import { CodexPage } from "@/presentation/components/book/CodexPage";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import { ContentsPage } from "@/presentation/components/book/ContentsPage";
import { FrontispiecePage } from "@/presentation/components/book/FrontispiecePage";
import {
  ClonedPage,
  LeafFace,
  LeftPageFace,
  PrintedHalf,
  type PageHalf,
} from "@/presentation/components/book/LeafFace";
import { useArrivingPage } from "@/presentation/components/book/turning/useArrivingPage";
import { RecordsPage } from "@/presentation/components/book/RecordsPage";
import type { BookRect } from "@/presentation/components/book/turning/opening";
import { OpeningScene } from "@/presentation/components/book/turning/OpeningScene";
import {
  curlCss,
  PageTurn,
  type LeafBox,
} from "@/presentation/components/book/turning/PageTurn";
import {
  leafBoxOf,
  useLeafBox,
} from "@/presentation/components/book/turning/useLeafBox";
import { useFacingPages } from "@/presentation/components/book/turning/useFacingPages";
import {
  usePageTurns,
  type ActiveTurn,
  type LeafPrints,
} from "@/presentation/components/book/turning/usePageTurns";
import type { TurnDirection } from "@/presentation/components/book/turning/turnPlan";
import { useSoundPreference } from "@/presentation/components/book/turning/useSoundPreference";
import { useBookLocation } from "@/presentation/components/book/useBookLocation";
import { useContents } from "@/presentation/components/book/useContents";
import { useMotionMode } from "@/presentation/components/draw/useMotionMode";
import { useAtelierServices } from "@/presentation/services/atelierServices";
import { PUBLIC_BASE_PATH } from "@/shared/config/publicBasePath";

const deskStyle = {
  "--desk-portrait": `url("${PUBLIC_BASE_PATH}/book/desk-portrait.webp")`,
  "--desk-landscape": `url("${PUBLIC_BASE_PATH}/book/desk-landscape.webp")`,
  "--book-page-edge": `url("${PUBLIC_BASE_PATH}/book/page-edge.svg")`,
} as CSSProperties;

/**
 * The whole site: a spell book on a desk. Closed at first; opened, the
 * frontispiece faces the contents, and each spread is a chapter. Moving
 * through the book turns its pages.
 */
export function AtelierBook() {
  const { place, turned, turnTo, replaceWith } = useBookLocation();
  const entries = useContents(place);
  const facingPages = useFacingPages();
  const reducedMotion = useMotionMode() === "reduced";
  const { pageSound } = useAtelierServices();
  const sound = useSoundPreference();
  const { shown, turn, arrival, finishTurn, turnLeaf, leafTurning } =
    usePageTurns({
      place,
      turned,
      entries,
      facingPages,
      reducedMotion,
      sound: pageSound,
      soundOn: sound.pageSounds,
    });
  const lost =
    entries !== undefined && isEntryPlace(place) && !entryFor(place, entries);
  const root = useRef<HTMLElement>(null);
  const spread = useRef<HTMLDivElement>(null);
  const [closedBook, setClosedBook] = useState<BookRect>();
  // The entry lit on this visit to the contents, where a turn may go next.
  const [intent, setIntent] = useState<{
    readonly place: BookPlace;
    readonly from: BookPlace;
  }>();
  // A deep-linked chapter lays its spread out only once the contents load.
  const layoutKey = `${hashFor(shown) || shown.kind}:${entries ? "ready" : "loading"}`;
  const leafBox = useLeafBox(spread, facingPages, layoutKey);
  // The opening ends exactly on the live page beneath it.
  const measurePage = useCallback(
    () => (spread.current ? leafBoxOf(spread.current, facingPages) : undefined),
    [facingPages],
  );
  const arrived = useRef(false);

  // A link to a spread that was deleted opens the contents instead.
  useEffect(() => {
    if (lost) replaceWith(CONTENTS);
  }, [lost, replaceWith]);

  // Once a page has arrived, its title takes the focus.
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    const titles =
      root.current?.querySelectorAll<HTMLElement>("[data-page-title]");
    const visible = [...(titles ?? [])].find(
      (title) => title.offsetParent !== null && !title.closest("[inert]"),
    );
    visible?.focus({ preventScroll: true });
  }, [shown]);

  // While a leaf turns, the page being left stays exactly as it is, so the
  // turn's first frame paints only the leaf; the page it uncovers is printed
  // under the leaf, and the new place mounts once the leaf has landed.
  const underneath = turn ? pageUnderneath(turn) : shown;
  const arrivingPage = useArrivingPage({
    shown,
    turn,
    intended: intent && intent.from === shown ? intent.place : undefined,
    isLivePage: isEntryPlace,
  });
  // What a leaf shows of a live page it turns to: a copy of it, laid out
  // unseen beneath; until that is ready, blank paper.
  const arrivingCopy = (pagePlace: BookPlace, half: PageHalf) => {
    const { copy } = arrivingPage;
    return copy && samePlace(copy.place, pagePlace) ? (
      <PrintedHalf
        key={copy.version}
        page={<ClonedPage source={copy.page} />}
        half={half}
      />
    ) : undefined;
  };
  const rightHalf: PageHalf = facingPages ? "right" : "whole";
  // The page shown, and the one a turn arrives at, mounted unseen; keyed by
  // place, so the arriving page stays the same instance once shown.
  const pages = [
    { place: underneath, unseen: false },
    ...(arrivingPage.staged
      ? [{ place: arrivingPage.staged, unseen: true }]
      : []),
  ];
  const actions: PageActions = {
    turnTo,
    open: (book) => {
      setClosedBook({
        left: book.left,
        top: book.top,
        width: book.width,
        height: book.height,
      });
      turnTo(FRONTISPIECE);
    },
    back: () => turnTo(placeBefore(place)),
    turnLeaf,
    leafTurning,
    light: (lit: BookPlace) => setIntent({ place: lit, from: shown }),
    sound: { on: sound.pageSounds, onToggle: sound.toggle },
  };

  return (
    <main
      ref={root}
      className="atelier-book"
      style={deskStyle}
      data-arrival={arrival}
      aria-label={BOOK_COPY.bookLabel}
    >
      {pages.map(({ place: pagePlace, unseen }) => (
        <div
          key={hashFor(pagePlace) || pagePlace.kind}
          ref={unseen ? arrivingPage.holder : undefined}
          className="book-place"
          data-unseen={unseen || undefined}
          inert={unseen || undefined}
          aria-hidden={unseen || undefined}
        >
          <PlacePages
            place={pagePlace}
            entries={entries}
            actions={actions}
            facingPages={facingPages}
            {...(unseen ? {} : { spreadRef: spread })}
          />
        </div>
      ))}
      {turn?.plan.kind === "open" && closedBook && (
        <OpeningScene
          from={closedBook}
          measurePage={measurePage}
          contents={
            entries && (
              <LeafFace
                place={CONTENTS}
                entries={entries}
                soundOn={sound.pageSounds}
              />
            )
          }
          frontispiece={
            <LeftPageFace
              place={FRONTISPIECE}
              entries={entries ?? []}
              soundOn={sound.pageSounds}
            />
          }
          onFinished={() => finishTurn(turn)}
        />
      )}
      {leafBox && (
        // Ready before any turn: parsing keyframes never delays the first frame.
        <style>{curlCss(leafBox.width, leafBox.height)}</style>
      )}
      {turn &&
        entries &&
        leafBox &&
        (turn.plan.kind === "single" || turn.plan.kind === "riffle") && (
          <>
            {facingPages && turn.plan.direction === "back" && (
              // Turning back, the page arriving on the left is already there
              // as the leaf lifts off it.
              <div
                className="page-turn__still"
                style={leftPage(leafBox)}
                inert
                aria-hidden="true"
              >
                {turn.prints ? (
                  <PrintedHalf page={turn.prints.arriving} half="left" />
                ) : (
                  (arrivingCopy(turn.to, "left") ?? (
                    <LeftPageFace
                      place={turn.to}
                      entries={entries}
                      soundOn={sound.pageSounds}
                    />
                  ))
                )}
              </div>
            )}
            <PageTurn
              kind={turn.plan.kind}
              direction={turn.plan.direction}
              box={leafBox}
              clip={facingPages ? openBook(leafBox) : leafBox}
              face={
                turn.prints ? (
                  <PrintedHalf page={leafPrint(turn)} half="right" />
                ) : (
                  (arrivingCopy(leafPlace(turn), rightHalf) ?? (
                    <LeafFace
                      place={leafPlace(turn)}
                      entries={entries}
                      soundOn={sound.pageSounds}
                      lit={turn.to}
                    />
                  ))
                )
              }
              {...(turn.plan.direction === "forward"
                ? {
                    under: turn.prints ? (
                      <PrintedHalf page={turn.prints.arriving} half="right" />
                    ) : (
                      (arrivingCopy(turn.to, rightHalf) ?? (
                        <LeafFace
                          place={turn.to}
                          entries={entries}
                          soundOn={sound.pageSounds}
                        />
                      ))
                    ),
                  }
                : {})}
              {...(facingPages
                ? {
                    back: turn.prints ? (
                      <PrintedHalf page={backPrint(turn)} half="left" />
                    ) : (
                      (arrivingCopy(backOnLeft(turn), "left") ?? (
                        <LeftPageFace
                          place={backOnLeft(turn)}
                          entries={entries}
                          soundOn={sound.pageSounds}
                        />
                      ))
                    ),
                  }
                : {})}
              onFinished={() => finishTurn(turn)}
            />
          </>
        )}
    </main>
  );
}

/** A leaf turns over the page being left; the opening scene fades off the new one. */
function pageUnderneath(turn: ActiveTurn): BookPlace {
  const { plan } = turn;
  return plan.kind === "single" || plan.kind === "riffle" ? turn.from : turn.to;
}

/**
 * With facing pages, the left page printed on the leaf's back: forward, the
 * page arriving; back, the page being left.
 */
function backOnLeft(turn: ActiveTurn): BookPlace {
  const { plan } = turn;
  const forward =
    (plan.kind === "single" || plan.kind === "riffle") &&
    plan.direction === "forward";
  return forward ? turn.to : turn.from;
}

/** The whole open book, from the right-hand page the leaf lies on. */
function openBook(leaf: LeafBox): LeafBox {
  return { ...leaf, left: leaf.left - leaf.width, width: leaf.width * 2 };
}

/** The left-hand page, facing the one the leaf lies on. */
function leftPage(leaf: LeafBox): LeafBox {
  return { ...leaf, left: leaf.left - leaf.width };
}

/** Within a place, the copy printed on the leaf's face: leaving, or arriving. */
function leafPrint(turn: ActiveTurn): ReactNode {
  return turn.plan.kind === "single" && turn.plan.direction === "forward"
    ? turn.prints?.leaving
    : turn.prints?.arriving;
}

/** Within a place, the copy printed on the leaf's back: arriving, or leaving. */
function backPrint(turn: ActiveTurn): ReactNode {
  return turn.plan.kind === "single" && turn.plan.direction === "forward"
    ? turn.prints?.arriving
    : turn.prints?.leaving;
}

/** The page printed on the leaf that turns: the one leaving, or arriving. */
function leafPlace(turn: ActiveTurn): BookPlace {
  const { plan } = turn;
  const forward =
    (plan.kind === "single" || plan.kind === "riffle") &&
    plan.direction === "forward";
  return forward ? turn.from : turn.to;
}

interface PageActions {
  readonly turnTo: (place: BookPlace) => void;
  readonly open: (book: DOMRect) => void;
  readonly back: () => void;
  /** Turns one leaf within the page shown (see `usePageTurns`). */
  readonly turnLeaf: (direction: TurnDirection, prints: LeafPrints) => void;
  readonly leafTurning: boolean;
  /** A contents entry was lit: its page is laid out, ready to turn to. */
  readonly light: (place: BookPlace) => void;
  readonly sound: { readonly on: boolean; readonly onToggle: () => void };
}

function isEntryPlace(place: BookPlace): boolean {
  return (
    place.kind === "chapter" ||
    place.kind === "codex" ||
    place.kind === "records"
  );
}

function entryFor(
  place: BookPlace,
  entries: readonly ContentsEntry[],
): ContentsEntry | undefined {
  return entries.find((candidate) => samePlace(candidate.place, place));
}

interface PlacePagesProps {
  readonly place: BookPlace;
  readonly entries: readonly ContentsEntry[] | undefined;
  readonly actions: PageActions;
  readonly facingPages: boolean;
  /** The live page's spread, measured for the leaf; none while unseen. */
  readonly spreadRef?: RefObject<HTMLDivElement | null>;
}

/** The pages for one place in the book, live and usable. */
function PlacePages({
  place,
  entries,
  actions,
  facingPages,
  spreadRef: spread,
}: PlacePagesProps) {
  const { turnTo, open, back, turnLeaf, leafTurning, light, sound } = actions;
  const entry = entries && entryFor(place, entries);
  switch (place.kind) {
    case "cover":
      return <BookCover onOpen={open} />;
    case "frontispiece":
    case "contents":
      return (
        <div
          ref={spread}
          className="book-spread"
          data-focus={place.kind === "frontispiece" ? "left" : "right"}
        >
          <FrontispiecePage onToContents={() => turnTo(CONTENTS)} />
          <ContentsPage
            {...(entries ? { entries } : {})}
            onOpen={turnTo}
            onLight={light}
            sound={sound}
          />
        </div>
      );
    case "chapter":
      return (
        entry && (
          <div ref={spread} className="book-spread" key={place.templateId}>
            <ChapterPage
              entry={entry}
              templateId={place.templateId}
              layout={facingPages ? "facing-pages" : "single-page"}
              turnLeaf={turnLeaf}
              leafTurning={leafTurning}
              onBack={back}
            />
          </div>
        )
      );
    case "codex":
      return (
        entry && (
          <div ref={spread} className="book-spread">
            <CodexPage
              entry={entry}
              layout={facingPages ? "facing-pages" : "single-page"}
              onBack={back}
            />
          </div>
        )
      );
    case "records":
      return (
        entry && (
          <div ref={spread} className="book-spread">
            <RecordsPage
              entry={entry}
              layout={facingPages ? "facing-pages" : "single-page"}
              turnLeaf={turnLeaf}
              leafTurning={leafTurning}
              onBack={back}
            />
          </div>
        )
      );
  }
}
