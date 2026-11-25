"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ReadingRequester } from "@/application/use-cases/requestReading";
import { STANDARD_DECK_ID } from "@/domain/deck/builtinDecks";
import type { RandomSource } from "@/domain/deck/draw";
import type { ReadingRecord } from "@/domain/history/readingHistory";
import type { Deck } from "@/domain/deck/deck";
import { findPlacedCard, roundKeyOf } from "@/domain/spread/round";
import type { Spread, SpreadPosition } from "@/domain/spread/types";
import { DealerDeck } from "@/presentation/components/draw/DealerDeck";
import {
  ARRANGING_SLOT_WIDTH_CQW,
  slotWidthFor,
} from "@/presentation/components/spread/boardGeometry";
import { BoardZoomControls } from "@/presentation/components/spread/BoardZoomControls";
import { useShuffleGestures } from "@/presentation/components/draw/useShuffleGestures";
import { useReadingHistory } from "@/presentation/components/history/useReadingHistory";
import { useRoundRecorder } from "@/presentation/components/history/useRoundRecorder";
import { ShareDialog } from "@/presentation/components/share/ShareDialog";
import { CardViewer } from "@/presentation/components/draw/CardViewer";
import { PlacedCards } from "@/presentation/components/draw/PlacedCards";
import { motionTimingStyle } from "@/presentation/components/draw/dealMotion";
import { useMotionMode } from "@/presentation/components/draw/useMotionMode";
import { ReadingPanel } from "@/presentation/components/reading/ReadingPanel";
import { createRequestId as createReadingRequestId } from "@/presentation/components/reading/readingSession";
import { useReadingServices } from "@/presentation/components/reading/useReadingServices";
import { useReadingSession } from "@/presentation/components/reading/useReadingSession";
import { ArrangeConfirmDialog } from "@/presentation/components/spread/ArrangeConfirmDialog";
import { TableHint } from "@/presentation/components/draw/TableHint";
import { BookFloatButton } from "@/presentation/components/book/BookFloatButton";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import { MainQuestionField } from "@/presentation/components/spread/MainQuestionField";
import {
  SpreadBoard,
  visibleCenter,
} from "@/presentation/components/spread/SpreadBoard";
import { SpreadDetails } from "@/presentation/components/spread/SpreadDetails";
import { SpreadToolbar } from "@/presentation/components/spread/SpreadToolbar";
import { TemplateShelf } from "@/presentation/components/spread/TemplateShelf";
import type { TableLayout } from "@/presentation/components/draw/tableLayout";
import {
  ReadingSpread,
  type PrintedSpread,
  type ReadingPages,
} from "@/presentation/components/reading/ReadingSpread";
import { tableAbilities } from "@/presentation/components/spread/tableMode";
import { useArrangeMode } from "@/presentation/components/spread/useArrangeMode";
import { usePositionHandlers } from "@/presentation/components/spread/usePositionHandlers";
import { useBoardViewport } from "@/presentation/components/spread/useBoardViewport";
import { useSpreadDealer } from "@/presentation/components/spread/useSpreadDealer";
import {
  createClientId,
  useSpreadSession,
} from "@/presentation/components/spread/useSpreadSession";
import { useAtelierServices } from "@/presentation/services/atelierServices";

interface DrawExperienceProps {
  readonly randomSource?: RandomSource;
  readonly createId?: () => string;
  /** The clock for recording rounds, e.g. fixed in tests. */
  readonly now?: () => Date;
  /** Replaces the requester around the provider, e.g. in tests. */
  readonly readingRequester?: ReadingRequester;
  readonly createRequestId?: () => string;
  /** The chapter's spread; the table starts from it on every visit. */
  readonly templateId?: string;
  /**
   * Hears whether leaving now would lose something: cards drawn but not all
   * revealed, or a layout being edited.
   */
  readonly onUnfinishedChange?: (unfinished: boolean) => void;
  /** One page under another, or two facing pages that never scroll. */
  readonly layout?: TableLayout;
  /** With facing pages, the reading's own spreads after the table's. */
  readonly readingPages?: ReadingPages;
}

/**
 * The spread table: arrange 1–12 numbered positions, give each its own
 * question, then deal every empty position from one pile in a single
 * motion and reveal the cards one by one.
 */
export function DrawExperience({
  randomSource,
  createId = createClientId,
  now = currentTime,
  readingRequester: readingRequesterOverride,
  createRequestId = createReadingRequestId,
  templateId,
  onUnfinishedChange,
  layout = "single-page",
  readingPages,
}: DrawExperienceProps = {}) {
  const root = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const {
    registry,
    readingProvider,
    templateStorage,
    historyStorage,
    retiredTableStorage,
    share: shareServices,
  } = useAtelierServices();
  const deck = useMemo(
    () => registry.get(STANDARD_DECK_ID) ?? registry.getSelected(),
    [registry],
  );
  const { requester: readingRequester } = useReadingServices({
    ...(readingRequesterOverride
      ? { requester: readingRequesterOverride }
      : {}),
    createRequestId,
  });
  const session = useSpreadSession(
    templateStorage,
    retiredTableStorage,
    createId,
    templateId,
  );
  const { state, dispatch, generation } = session;
  const { spread, revealedInstanceIds, selectedId } = state;
  const announce = useCallback(
    (text: string) => dispatch({ type: "announce", text }),
    [dispatch],
  );
  const history = useReadingHistory(historyStorage, announce);
  const [sharing, setSharing] = useState<ReadingRecord>();
  const [inspected, setInspected] = useState<string>();
  const arrange = useArrangeMode({
    spread,
    ...(state.editBaseline ? { editBaseline: state.editBaseline } : {}),
    library: state.library,
    dispatch,
    onDrawsCleared: () => setInspected(undefined),
  });
  const { arranging } = arrange;

  const loading = session.status === "loading";
  const viewport = useBoardViewport(viewportRef, canvasRef);
  const motionMode = useMotionMode();
  // The positions' card size. In play it is as large as the layout allows;
  // while arranging it holds still at the smallest size, so cards never grow
  // or shrink under a drag. The deck has one size for every spread.
  const fittedSlotWidth = useMemo(
    () => slotWidthFor(spread.positions),
    [spread.positions],
  );
  const slotWidth = arranging ? ARRANGING_SLOT_WIDTH_CQW : fittedSlotWidth;
  const dealer = useSpreadDealer({
    deck,
    spread,
    revealedInstanceIds,
    generation,
    loading,
    randomSource,
    motionMode,
    root,
    tableScale: viewport.view.scale,
    arranging,
    dispatch,
  });
  const abilities = tableAbilities(arrange.mode, dealer.layoutLocked);
  const shuffleReady = dealer.canShuffle && abilities.canPlay;
  const shuffle = useShuffleGestures({
    ready: shuffleReady,
    phase: dealer.phase,
    onHold: dealer.hold,
    onRelease: dealer.release,
    boardGestures: viewport.gestureHandlers,
  });
  const reading = useReadingSession({
    spread,
    registry,
    requester: readingRequester,
    createRequestId,
  });
  const selected = spread.positions.find((p) => p.id === selectedId);
  const filled = spread.positions.filter((p) => p.drawResult).length;
  // `allRevealed` also holds for an empty table (nothing left unrevealed); a
  // reading needs every position drawn as well.
  const spreadRevealed =
    filled > 0 && dealer.emptyCount === 0 && dealer.allRevealed;

  // The reading opens on request, once per round: a new round closes it.
  const [readingRound, setReadingRound] = useState<string>();
  const roundKey = roundKeyOf(spread);
  // With facing pages the reading lies on the next pages; on one page it
  // opens under the table.
  const readingPage =
    layout === "facing-pages" ? readingPages?.page : undefined;
  const readingOpen =
    layout === "single-page" &&
    spreadRevealed &&
    roundKey !== undefined &&
    readingRound === roundKey;
  // One spread of the reading on facing pages, live or as a still copy.
  const readingOnPages = (
    page: number,
    heading: ReactNode,
    onPage: (page: number) => void,
  ) => (
    <ReadingSpread page={page} onPage={onPage}>
      <ReadingPanel
        session={reading}
        revealed={spreadRevealed}
        source={readingProvider.source}
        onShare={shareRound}
        heading={heading}
      />
    </ReadingSpread>
  );
  // The still copy sits where the live one would, so it lays out the same.
  const printedSpread: PrintedSpread = (page) => (
    <div className="draw-experience">
      <div className="draw-table paper-surface" data-layout="facing-pages">
        <div className="draw-table__reading">
          {readingOnPages(page, readingPages?.printedHeading, STILL_PAGE)}
        </div>
      </div>
    </div>
  );
  const showReadingPage = (page: number | undefined) =>
    readingPages?.show(page, printedSpread);
  const openReading = () =>
    layout === "facing-pages" && readingPages
      ? showReadingPage(0)
      : setReadingRound(roundKey);

  const unfinished = arranging || (filled > 0 && !spreadRevealed);
  // On facing pages the notes page has room for the question or for the
  // spread library and position editor, not both; arranging takes it.
  const questionShown = !(arranging && layout === "facing-pages");
  useEffect(() => {
    onUnfinishedChange?.(unfinished);
  }, [unfinished, onUnfinishedChange]);

  const handleRevealed = useCallback(
    (instanceId: string) => dispatch({ type: "revealed", instanceId }),
    [dispatch],
  );
  const spreadName = state.library.find(
    (template) => template.id === spread.templateId,
  )?.name;
  const { recordToShare } = useRoundRecorder({
    spread,
    revealedInstanceIds,
    deckId: deck.id,
    ...(spreadName ? { spreadName } : {}),
    reading,
    history,
    createId,
    now,
  });
  const shareRound = () => setSharing(recordToShare());
  const viewed = viewedCard(spread, deck, inspected);
  const handlers = usePositionHandlers({ dispatch, arranging });
  const renderCards = (position: SpreadPosition) => (
    <PlacedCards
      position={position}
      deck={deck}
      flights={dealer.flights}
      playable={abilities.canPlay}
      revealedInstanceIds={revealedInstanceIds}
      motionMode={motionMode}
      onRevealed={handleRevealed}
      onInspect={setInspected}
    />
  );

  return (
    <div
      ref={root}
      className="draw-experience"
      data-phase={dealer.phase}
      data-motion={motionMode}
      style={motionTimingStyle()}
      data-all-revealed={dealer.allRevealed || undefined}
      data-table-mode={arrange.mode}
      aria-busy={loading || undefined}
    >
      <div className="draw-table paper-surface" data-layout={layout}>
        {readingPage !== undefined && readingPages ? (
          <div className="draw-table__reading">
            {readingOnPages(readingPage, readingPages.heading, showReadingPage)}
          </div>
        ) : (
          <>
            {/* The table itself: the left page, with facing pages. */}
            <div className="draw-table__play">
              <SpreadToolbar
                positionCount={spread.positions.length}
                layoutLocked={dealer.layoutLocked}
                arranging={arranging}
                canToggleArrange={abilities.canToggleArrange}
                onToggleArrange={arrange.toggle}
                onAdd={() =>
                  dispatch({
                    type: "add",
                    near: visibleCenter(viewportRef.current, fieldRef.current),
                  })
                }
                canClear={dealer.canClear}
                onClear={session.clear}
              />

              <div className="draw-table__stage spread-stage">
                <SpreadBoard
                  spread={spread}
                  slotWidth={slotWidth}
                  zoom={dealer.zoom}
                  selectedId={selectedId}
                  arrangeable={abilities.canArrange}
                  pressToShuffle={shuffleReady}
                  awaitingIds={dealer.awaitingIds}
                  view={viewport.view}
                  gestures={shuffle.tableGestures}
                  viewportRef={viewportRef}
                  canvasRef={canvasRef}
                  fieldRef={fieldRef}
                  renderCards={renderCards}
                  onSelect={handlers.select}
                  onMove={handlers.move}
                  onNudge={handlers.nudge}
                  onRotate={handlers.rotate}
                  overlay={
                    arranging ? (
                      <BoardZoomControls
                        canZoomIn={viewport.canZoomIn}
                        canZoomOut={viewport.canZoomOut}
                        onZoomIn={viewport.zoomIn}
                        onZoomOut={viewport.zoomOut}
                      />
                    ) : (
                      <DealerDeck
                        dealer={dealer}
                        deckId={deck.id}
                        canShuffle={shuffleReady}
                        hold={shuffle.deckHold}
                      />
                    )
                  }
                />
              </div>

              <TableHint status={dealer.status} remaining={dealer.remaining} />
            </div>

            {/* What the table is asked, and what lies on it: the right page. */}
            <div className="draw-table__notes">
              {questionShown && (
                <>
                  <p
                    className="draw-table__heading"
                    lang="en"
                    aria-hidden="true"
                  >
                    {BOOK_COPY.questionHeading}
                  </p>
                  {/* The question comes first: dealing needs it. */}
                  <div className="draw-table__question">
                    <MainQuestionField
                      value={spread.mainQuestion}
                      onChange={(text) =>
                        dispatch({ type: "main-question", text })
                      }
                    />
                  </div>
                </>
              )}

              <p className="spread-notice" role="status">
                {state.notice?.text}
              </p>

              {arranging && (
                <div className="draw-table__shelf">
                  <TemplateShelf
                    library={state.library}
                    activeTemplateId={spread.templateId}
                    applyLocked={filled > 0}
                    busy={dealer.layoutLocked}
                    onApply={(id) =>
                      dispatch({ type: "apply-template", templateId: id })
                    }
                    onBlank={() => dispatch({ type: "blank" })}
                    onSave={(name) => dispatch({ type: "save-template", name })}
                    onDelete={(id) =>
                      dispatch({ type: "delete-template", templateId: id })
                    }
                    onRestore={() => dispatch({ type: "restore-templates" })}
                  />
                </div>
              )}

              <p className="draw-table__heading" lang="en" aria-hidden="true">
                {BOOK_COPY.positionsHeading}
              </p>
              <SpreadDetails
                positions={spread.positions}
                deck={deck}
                {...(selected ? { selected } : {})}
                arranging={arranging}
                layoutLocked={dealer.layoutLocked}
                arrangeable={abilities.canArrange}
                revealedInstanceIds={revealedInstanceIds}
                {...(dealer.next ? { nextPositionId: dealer.next.id } : {})}
                handlers={handlers}
                dispatch={dispatch}
              />

              {spreadRevealed && !arranging && !readingOpen && (
                <div className="draw-table__reading-cue">
                  <BookFloatButton
                    label={BOOK_COPY.cardReadingLabel}
                    onPress={openReading}
                  >
                    <span lang="en">{BOOK_COPY.cardReading}</span>
                  </BookFloatButton>
                </div>
              )}
              {readingOpen && (
                <ReadingPanel
                  session={reading}
                  revealed={spreadRevealed}
                  source={readingProvider.source}
                  onShare={shareRound}
                  heading={<ReadingTitle />}
                />
              )}
            </div>
          </>
        )}
      </div>
      {arrange.confirmation && (
        <ArrangeConfirmDialog
          confirmation={arrange.confirmation}
          onConfirm={arrange.confirm}
          onCancel={arrange.cancel}
        />
      )}
      {sharing && (
        <ShareDialog
          record={sharing}
          registry={registry}
          services={shareServices}
          onClose={() => setSharing(undefined)}
        />
      )}
      {viewed && (
        <CardViewer
          card={viewed.card}
          orientation={viewed.instance.orientation}
          role={viewed.role}
          positionIndex={viewed.position.index}
          question={viewed.position.question}
          onClose={() => setInspected(undefined)}
        />
      )}
    </div>
  );
}

function currentTime(): Date {
  return new Date();
}

/** The card shown enlarged, if it is still on the table. */
function viewedCard(spread: Spread, deck: Deck, instanceId?: string) {
  const placed = instanceId ? findPlacedCard(spread, instanceId) : undefined;
  const card = placed ? deck.getCard(placed.instance.cardId) : undefined;
  return placed && card ? { ...placed, card } : undefined;
}

/** A still copy's page turns lead nowhere. */
const STILL_PAGE = () => undefined;

/**
 * The reading's title under the table on one page, set as on the reading's
 * own page; the panel's heading names it for assistive tech.
 */
function ReadingTitle() {
  return (
    <p className="book-title" lang="en" aria-hidden="true">
      {BOOK_COPY.readingTitle}
    </p>
  );
}
