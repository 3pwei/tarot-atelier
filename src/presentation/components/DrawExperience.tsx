"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReadingRequester } from "@/application/use-cases/requestReading";
import { STANDARD_DECK_ID } from "@/domain/deck/builtinDecks";
import type { RandomSource } from "@/domain/deck/draw";
import type { ReadingRecord } from "@/domain/history/readingHistory";
import type { Deck } from "@/domain/deck/deck";
import { findPlacedCard } from "@/domain/spread/round";
import type { Spread, SpreadPosition } from "@/domain/spread/types";
import { DealerDeck } from "@/presentation/components/draw/DealerDeck";
import {
  ARRANGING_SLOT_WIDTH_CQW,
  slotWidthFor,
} from "@/presentation/components/spread/boardGeometry";
import { BoardZoomControls } from "@/presentation/components/spread/BoardZoomControls";
import { useShuffleGestures } from "@/presentation/components/draw/useShuffleGestures";
import { HistoryDialog } from "@/presentation/components/history/HistoryDialog";
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
import { TableStatusBar } from "@/presentation/components/draw/TableStatusBar";
import {
  SpreadBoard,
  visibleCenter,
} from "@/presentation/components/spread/SpreadBoard";
import { SpreadDetails } from "@/presentation/components/spread/SpreadDetails";
import { SpreadSetup } from "@/presentation/components/spread/SpreadSetup";
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
  const { requester: readingRequester, recordServices: recordReadingServices } =
    useReadingServices({
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
  const [showingHistory, setShowingHistory] = useState(false);
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

  const unfinished = arranging || (filled > 0 && !spreadRevealed);
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
      <div className="draw-table">
        <TableStatusBar
          status={dealer.status}
          remaining={dealer.remaining}
          mainQuestion={spread.mainQuestion}
          onMainQuestion={(text) => dispatch({ type: "main-question", text })}
        />

        <p className="spread-notice" role="status">
          {state.notice?.text}
        </p>

        <SpreadSetup
          library={state.library}
          activeTemplateId={spread.templateId}
          positionCount={spread.positions.length}
          drawn={filled > 0}
          layoutLocked={dealer.layoutLocked}
          arranging={arranging}
          canToggleArrange={abilities.canToggleArrange}
          canClear={dealer.canClear}
          dispatch={dispatch}
          onToggleArrange={arrange.toggle}
          onAdd={() =>
            dispatch({
              type: "add",
              near: visibleCenter(viewportRef.current, fieldRef.current),
            })
          }
          onClear={session.clear}
          onOpenHistory={() => setShowingHistory(true)}
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

        <ReadingPanel
          session={reading}
          revealed={spreadRevealed}
          source={readingProvider.source}
          onShare={shareRound}
        />

        <div className="draw-table__foot">
          <span>
            已抽 {filled} / {spread.positions.length} 個牌位
          </span>
          <span>牌陣庫和歷史紀錄保存在這台裝置</span>
        </div>
      </div>
      {arrange.confirmation && (
        <ArrangeConfirmDialog
          confirmation={arrange.confirmation}
          onConfirm={arrange.confirm}
          onCancel={arrange.cancel}
        />
      )}
      {showingHistory && (
        <HistoryDialog
          history={history.history}
          registry={registry}
          shareServices={shareServices}
          readingServices={recordReadingServices}
          onReading={history.attach}
          now={now}
          onRemove={history.remove}
          onClearAll={history.clearAll}
          onClose={() => setShowingHistory(false)}
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
