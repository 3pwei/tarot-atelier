"use client";

import { useCallback, useMemo, useRef } from "react";
import type { SpreadSessionStorage } from "@/application/ports/spreadSessionStorage";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import type { RandomSource } from "@/domain/deck/draw";
import type { SpreadPosition, TablePoint } from "@/domain/spread/types";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import { LocalStorageSpreadSessionStorage } from "@/infrastructure/persistence/localStorageSpreadSessionStorage";
import { DeckStack } from "@/presentation/components/draw/DeckStack";
import { DrawnCard } from "@/presentation/components/draw/DrawnCard";
import { useMotionMode } from "@/presentation/components/draw/useMotionMode";
import { MainQuestionField } from "@/presentation/components/spread/MainQuestionField";
import { PositionInspector } from "@/presentation/components/spread/PositionInspector";
import { PositionList } from "@/presentation/components/spread/PositionList";
import {
  SpreadBoard,
  visibleCenter,
} from "@/presentation/components/spread/SpreadBoard";
import { SpreadToolbar } from "@/presentation/components/spread/SpreadToolbar";
import { useBoardViewport } from "@/presentation/components/spread/useBoardViewport";
import {
  dealerStatus,
  useSpreadDealer,
} from "@/presentation/components/spread/useSpreadDealer";
import {
  createClientId,
  useSpreadSession,
} from "@/presentation/components/spread/useSpreadSession";

const STANDARD_DECK_ID = "atelier-standard-tarot";

interface DrawExperienceProps {
  readonly randomSource?: RandomSource;
  readonly storage?: SpreadSessionStorage;
  readonly createId?: () => string;
}

/**
 * The spread table: arrange 1–12 numbered positions, give each its own
 * question, then deal cards from one pile into them in number order.
 */
export function DrawExperience({
  randomSource,
  storage: storageOverride,
  createId = createClientId,
}: DrawExperienceProps = {}) {
  const root = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const deck = useMemo(() => {
    const registry = registerBuiltInDecks(new InMemoryDeckRegistry());
    return registry.get(STANDARD_DECK_ID) ?? registry.getSelected();
  }, []);
  const storage = useMemo(
    () => storageOverride ?? new LocalStorageSpreadSessionStorage(),
    [storageOverride],
  );
  const session = useSpreadSession(deck, storage, createId);
  const { state, dispatch, generation } = session;
  const { spread, revealedInstanceIds, selectedId } = state;
  const loading = session.status === "loading";
  const viewport = useBoardViewport(viewportRef);
  const motionMode = useMotionMode();
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
    dispatch,
  });
  const status = dealerStatus({
    loading,
    phase: dealer.phase,
    blocker: dealer.blocker,
    next: dealer.next,
    flyingTo: dealer.flyingPosition?.index,
    allRevealed: dealer.allRevealed,
    remaining: dealer.remaining,
  });
  const selected = spread.positions.find((p) => p.id === selectedId);
  const filled = spread.positions.filter((p) => p.drawResult).length;

  const handleRevealed = useCallback(
    (instanceId: string) => dispatch({ type: "revealed", instanceId }),
    [dispatch],
  );
  const handleSelect = useCallback(
    (positionId?: string) => dispatch({ type: "select", positionId }),
    [dispatch],
  );
  const handleMove = useCallback(
    (positionId: string, point: TablePoint) =>
      dispatch({ type: "move", positionId, point }),
    [dispatch],
  );
  const handleNudge = useCallback(
    (positionId: string, delta: TablePoint) =>
      dispatch({ type: "nudge", positionId, delta }),
    [dispatch],
  );
  const handleRotate = useCallback(
    (positionId: string, degrees: number) =>
      dispatch({ type: "rotate", positionId, degrees }),
    [dispatch],
  );

  function renderCards(position: SpreadPosition) {
    const result = position.drawResult;
    if (!result) return null;
    const inFlight =
      dealer.phase === "drawing" && position.id === dealer.flyingPosition?.id;
    const cards = result.jumper
      ? ([
          ["primary", result.primary],
          ["jumper", result.jumper],
        ] as const)
      : ([["primary", result.primary]] as const);

    return cards.map(([role, instance]) => {
      const card = deck.getCard(instance.cardId);
      return card ? (
        <DrawnCard
          key={instance.instanceId}
          card={card}
          instance={instance}
          role={role}
          positionIndex={position.index}
          interactive={!inFlight}
          inFlight={inFlight}
          initiallyRevealed={revealedInstanceIds.has(instance.instanceId)}
          motionMode={motionMode}
          onRevealed={handleRevealed}
        />
      ) : null;
    });
  }

  return (
    <div
      ref={root}
      className="draw-experience"
      data-phase={dealer.phase}
      data-motion={motionMode}
      data-all-revealed={dealer.allRevealed || undefined}
      aria-busy={loading || undefined}
    >
      <div className="draw-table">
        <div className="draw-table__bar">
          <div className="draw-status">
            <span className="draw-status__light" aria-hidden="true" />
            <strong aria-live="polite">{status}</strong>
            <span>剩餘 {dealer.remaining} 張</span>
          </div>
          <div className="draw-table__controls">
            <button
              className="shuffle-action"
              type="button"
              disabled={!dealer.canShuffle}
              onClick={dealer.shuffle}
            >
              洗牌
            </button>
          </div>
        </div>

        <p className="spread-notice" role="status">
          {state.notice?.text}
        </p>

        <div className="spread-setup">
          <MainQuestionField
            value={spread.mainQuestion}
            onChange={(text) => dispatch({ type: "main-question", text })}
          />
          <SpreadToolbar
            presetId={spread.presetId}
            positionCount={spread.positions.length}
            presetsLocked={filled > 0}
            layoutLocked={dealer.layoutLocked}
            zoom={viewport.view.scale}
            canZoomIn={viewport.canZoomIn}
            canZoomOut={viewport.canZoomOut}
            onPreset={(presetId) => dispatch({ type: "preset", presetId })}
            onAdd={() =>
              dispatch({
                type: "add",
                near: visibleCenter(viewportRef.current, fieldRef.current),
              })
            }
            onZoomIn={viewport.zoomIn}
            onZoomOut={viewport.zoomOut}
            onZoomReset={viewport.reset}
            onClear={session.clear}
          />
        </div>

        <div className="draw-table__stage spread-stage">
          <DeckStack
            remaining={dealer.remaining}
            total={dealer.total}
            canDraw={dealer.canDraw}
            label={
              dealer.canDraw && dealer.next
                ? `從牌堆為牌位 ${dealer.next.index} 抽牌`
                : `牌堆：${status}`
            }
            hint={
              dealer.canDraw && dealer.next
                ? `點擊牌堆，抽給牌位 ${dealer.next.index}`
                : `${dealer.remaining} / ${dealer.total}`
            }
            onDraw={dealer.draw}
          />

          <SpreadBoard
            spread={spread}
            selectedId={selectedId}
            locked={dealer.layoutLocked}
            viewport={viewport}
            viewportRef={viewportRef}
            fieldRef={fieldRef}
            renderCards={renderCards}
            onSelect={handleSelect}
            onMove={handleMove}
            onNudge={handleNudge}
            onRotate={handleRotate}
          />
        </div>

        <div className="spread-details">
          {selected ? (
            <PositionInspector
              key={selected.id}
              position={selected}
              total={spread.positions.length}
              locked={dealer.layoutLocked}
              onQuestion={(text) =>
                dispatch({ type: "question", positionId: selected.id, text })
              }
              onRotate={(degrees) => handleRotate(selected.id, degrees)}
              onMove={(point) => handleMove(selected.id, point)}
              onReorder={(index) =>
                dispatch({ type: "reorder", positionId: selected.id, index })
              }
              onRemove={() =>
                dispatch({ type: "remove", positionId: selected.id })
              }
              onClose={() => handleSelect(undefined)}
            />
          ) : (
            <p className="spread-details__hint">
              點選牌位即可編輯問題、旋轉、排序或刪除；也可以直接拖曳，或聚焦號碼後用方向鍵、數字鍵盤移動。
            </p>
          )}
          <PositionList
            positions={spread.positions}
            deck={deck}
            selectedId={selectedId}
            revealedInstanceIds={revealedInstanceIds}
            nextPositionId={dealer.next?.id}
            onSelect={handleSelect}
          />
        </div>

        <div className="draw-table__foot">
          <span>
            已抽 {filled} / {spread.positions.length} 個牌位
          </span>
          <span>牌陣自動保存在這台裝置</span>
        </div>
      </div>
    </div>
  );
}
