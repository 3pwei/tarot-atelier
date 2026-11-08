"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  SpreadSessionStorage,
  SpreadTemplateStorage,
} from "@/application/ports/textStorage";
import type { ReadingProvider } from "@/application/ports/readingProvider";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import {
  createReadingRequester,
  type ReadingRequester,
} from "@/application/use-cases/requestReading";
import type { RandomSource } from "@/domain/deck/draw";
import type { CardInstance } from "@/domain/deck/types";
import type { Spread, SpreadPosition, TablePoint } from "@/domain/spread/types";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import {
  LocalStorageTextStorage,
  SPREAD_SESSION_STORAGE_KEY,
  SPREAD_TEMPLATE_STORAGE_KEY,
} from "@/infrastructure/persistence/localStorageTextStorage";
import { browserReadingConfig } from "@/infrastructure/config/readingConfig";
import { createBrowserReadingProvider } from "@/infrastructure/reading/readingProviders";
import { DeckStack } from "@/presentation/components/draw/DeckStack";
import { CardViewer } from "@/presentation/components/draw/CardViewer";
import {
  DrawnCard,
  type CardRole,
} from "@/presentation/components/draw/DrawnCard";
import { useMotionMode } from "@/presentation/components/draw/useMotionMode";
import { ReadingPanel } from "@/presentation/components/reading/ReadingPanel";
import { createRequestId as createReadingRequestId } from "@/presentation/components/reading/readingSession";
import { useReadingSession } from "@/presentation/components/reading/useReadingSession";
import { MainQuestionField } from "@/presentation/components/spread/MainQuestionField";
import { PositionInspector } from "@/presentation/components/spread/PositionInspector";
import { PositionList } from "@/presentation/components/spread/PositionList";
import {
  SpreadBoard,
  visibleCenter,
} from "@/presentation/components/spread/SpreadBoard";
import { SpreadToolbar } from "@/presentation/components/spread/SpreadToolbar";
import {
  tableAbilities,
  type TableMode,
} from "@/presentation/components/spread/tableMode";
import { TemplateShelf } from "@/presentation/components/spread/TemplateShelf";
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
  readonly templateStorage?: SpreadTemplateStorage;
  readonly createId?: () => string;
  /** Replaces the configured reading provider, e.g. in tests. */
  readonly readingProvider?: ReadingProvider;
  /** Replaces the requester around the provider, e.g. in tests. */
  readonly readingRequester?: ReadingRequester;
  readonly createRequestId?: () => string;
}

/**
 * The spread table: arrange 1–12 numbered positions, give each its own
 * question, then deal every empty position from one pile in a single
 * motion and reveal the cards one by one.
 */
export function DrawExperience({
  randomSource,
  storage: storageOverride,
  templateStorage: templateStorageOverride,
  createId = createClientId,
  readingProvider: readingProviderOverride,
  readingRequester: readingRequesterOverride,
  createRequestId = createReadingRequestId,
}: DrawExperienceProps = {}) {
  const root = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const registry = useMemo(
    () => registerBuiltInDecks(new InMemoryDeckRegistry()),
    [],
  );
  const deck = useMemo(
    () => registry.get(STANDARD_DECK_ID) ?? registry.getSelected(),
    [registry],
  );
  const readingProvider = useMemo(
    () =>
      readingProviderOverride ??
      createBrowserReadingProvider(registry, browserReadingConfig),
    [readingProviderOverride, registry],
  );
  const readingRequester = useMemo(
    () => readingRequesterOverride ?? createReadingRequester(readingProvider),
    [readingRequesterOverride, readingProvider],
  );
  const storage = useMemo(
    () =>
      storageOverride ??
      new LocalStorageTextStorage(SPREAD_SESSION_STORAGE_KEY),
    [storageOverride],
  );
  const templateStorage = useMemo(
    () =>
      templateStorageOverride ??
      new LocalStorageTextStorage(SPREAD_TEMPLATE_STORAGE_KEY),
    [templateStorageOverride],
  );
  const session = useSpreadSession(deck, storage, templateStorage, createId);
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
    emptyCount: dealer.emptyCount,
    flyingCount: dealer.flyingIds.length,
    allRevealed: dealer.allRevealed,
    remaining: dealer.remaining,
  });
  const [tableMode, setTableMode] = useState<TableMode>("play");
  const abilities = tableAbilities(tableMode, dealer.layoutLocked);
  const [inspected, setInspected] = useState<string>();
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

  const handleRevealed = useCallback(
    (instanceId: string) => dispatch({ type: "revealed", instanceId }),
    [dispatch],
  );
  const drawn = drawnCardOf(spread, inspected);
  const viewedCard = drawn ? deck.getCard(drawn.instance.cardId) : undefined;
  const viewed =
    drawn && viewedCard ? { ...drawn, card: viewedCard } : undefined;
  const handleInspect = useCallback(
    (instanceId: string) => setInspected(instanceId),
    [],
  );
  const arranging = tableMode === "arrange";
  // Selecting a position opens its editor, which belongs to arrange mode.
  const handleSelect = useCallback(
    (positionId?: string) => {
      if (arranging) dispatch({ type: "select", positionId });
    },
    [arranging, dispatch],
  );
  const toggleArrange = () => {
    if (arranging) dispatch({ type: "select", positionId: undefined });
    setTableMode(arranging ? "play" : "arrange");
  };
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
    const dealOrder = dealer.flyingIds.indexOf(position.id);
    const inFlight = dealer.phase === "drawing" && dealOrder >= 0;
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
          interactive={!inFlight && abilities.canPlay}
          inFlight={inFlight}
          dealOrder={Math.max(0, dealOrder)}
          initiallyRevealed={revealedInstanceIds.has(instance.instanceId)}
          motionMode={motionMode}
          onRevealed={handleRevealed}
          onInspect={handleInspect}
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
      data-table-mode={tableMode}
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
              disabled={!dealer.canShuffle || !abilities.canPlay}
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
          {arranging && (
            <TemplateShelf
              library={state.library}
              activeTemplateId={spread.templateId}
              applyLocked={filled > 0}
              busy={dealer.layoutLocked}
              onApply={(templateId) =>
                dispatch({ type: "apply-template", templateId })
              }
              onBlank={() => dispatch({ type: "blank" })}
              onSave={(name) => dispatch({ type: "save-template", name })}
              onDelete={(templateId) =>
                dispatch({ type: "delete-template", templateId })
              }
              onRestore={() => dispatch({ type: "restore-templates" })}
            />
          )}
          <SpreadToolbar
            positionCount={spread.positions.length}
            layoutLocked={dealer.layoutLocked}
            arranging={arranging}
            canToggleArrange={abilities.canToggleArrange}
            onToggleArrange={toggleArrange}
            zoom={viewport.view.scale}
            canZoomIn={viewport.canZoomIn}
            canZoomOut={viewport.canZoomOut}
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
            canDraw={dealer.canDraw && abilities.canPlay}
            label={
              dealer.canDraw && abilities.canPlay
                ? `從牌堆發牌到 ${dealer.emptyCount} 個牌位`
                : `牌堆：${status}`
            }
            hint={
              arranging
                ? "編輯牌陣中，完成後才能發牌"
                : dealer.canDraw
                  ? `點擊牌堆，一次發完 ${dealer.emptyCount} 個牌位`
                  : `${dealer.remaining} / ${dealer.total}`
            }
            onDraw={dealer.deal}
          />

          <SpreadBoard
            spread={spread}
            selectedId={selectedId}
            arrangeable={abilities.canArrange}
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
          {selected && arranging ? (
            <PositionInspector
              key={selected.id}
              position={selected}
              total={spread.positions.length}
              locked={dealer.layoutLocked}
              arrangeable={abilities.canArrange}
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
              {arranging
                ? "編輯牌陣中：點選牌位可改問題、排序或刪除；拖曳可移動；長按牌位後拖曳，或拖曳右下角的迴轉箭頭可旋轉；也可聚焦號碼後用方向鍵、數字鍵盤操作。完成後按「完成編輯」。"
                : "翻開的牌點一下可放大。要換牌陣範本、改牌位問題、新增或移動牌位，請按「編輯牌陣」。"}
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

        <ReadingPanel
          session={reading}
          deck={deck}
          spread={spread}
          revealed={spreadRevealed}
          source={readingProvider.source}
        />

        <div className="draw-table__foot">
          <span>
            已抽 {filled} / {spread.positions.length} 個牌位
          </span>
          <span>牌陣自動保存在這台裝置</span>
        </div>
      </div>
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

/** The drawn card with `instanceId`, if it is still on the table. */
function drawnCardOf(
  spread: Spread,
  instanceId: string | undefined,
):
  | { position: SpreadPosition; role: CardRole; instance: CardInstance }
  | undefined {
  if (!instanceId) return undefined;
  for (const position of spread.positions) {
    const result = position.drawResult;
    if (result?.primary.instanceId === instanceId) {
      return { position, role: "primary", instance: result.primary };
    }
    if (result?.jumper?.instanceId === instanceId) {
      return { position, role: "jumper", instance: result.jumper };
    }
  }
  return undefined;
}
