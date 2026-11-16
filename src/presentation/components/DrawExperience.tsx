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
import { hasDraws } from "@/domain/spread/spread";
import type { Spread, SpreadPosition, TablePoint } from "@/domain/spread/types";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import {
  LocalStorageTextStorage,
  SPREAD_SESSION_STORAGE_KEY,
  SPREAD_TEMPLATE_STORAGE_KEY,
} from "@/infrastructure/persistence/localStorageTextStorage";
import { browserReadingConfig } from "@/infrastructure/config/readingConfig";
import { createBrowserReadingProvider } from "@/infrastructure/reading/readingProviders";
import { TableDeck } from "@/presentation/components/draw/TableDeck";
import { useHoldToShuffle } from "@/presentation/components/draw/useHoldToShuffle";
import { cardBackUrl } from "@/presentation/components/library/prerenderedArt";
import { ConfirmDialog } from "@/presentation/components/dialog/ConfirmDialog";
import {
  hasUnsavedLayout,
  revertTarget,
} from "@/presentation/components/spread/editBaseline";
import { CardViewer } from "@/presentation/components/draw/CardViewer";
import {
  DrawnCard,
  type CardRole,
} from "@/presentation/components/draw/DrawnCard";
import { motionTimingStyle } from "@/presentation/components/draw/dealMotion";
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
import { SpreadPicker } from "@/presentation/components/spread/SpreadPicker";
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
    holding: dealer.holding,
    picking: dealer.fan !== undefined,
    pickNumber: dealer.pickNumber,
    roundTotal: dealer.roundTotal,
    blocker: dealer.blocker,
    emptyCount: dealer.emptyCount,
    flyingCount: dealer.flights.length,
    allRevealed: dealer.allRevealed,
    remaining: dealer.remaining,
  });
  const [tableMode, setTableMode] = useState<TableMode>("play");
  const abilities = tableAbilities(tableMode, dealer.layoutLocked);
  const shuffleHold = useHoldToShuffle({
    enabled: dealer.canShuffle && abilities.canPlay,
    onHold: dealer.hold,
    onRelease: dealer.release,
  });
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
  const [confirmingArrange, setConfirmingArrange] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const beginArranging = () => {
    dispatch({ type: "begin-edit" });
    setTableMode("arrange");
  };
  const closeArranging = () => {
    dispatch({ type: "select", positionId: undefined });
    setConfirmingLeave(false);
    setTableMode("play");
  };
  const finishArranging = () => {
    dispatch({ type: "end-edit" });
    closeArranging();
  };
  const discardArranging = () => {
    dispatch({ type: "revert-edit" });
    closeArranging();
  };
  const leaveTarget = state.editBaseline
    ? revertTarget(state.editBaseline, spread, state.library)
    : undefined;
  const toggleArrange = () => {
    if (arranging) {
      // Unsaved layout changes are lost on leaving; ask first.
      if (leaveTarget && hasUnsavedLayout(spread, leaveTarget)) {
        setConfirmingLeave(true);
      } else {
        finishArranging();
      }
    } else if (hasDraws(spread)) {
      // Drawn positions cannot be rearranged; ask before returning the cards.
      setConfirmingArrange(true);
    } else {
      beginArranging();
    }
  };
  const arrangeAfterClearing = () => {
    dispatch({ type: "clear-draws" });
    setInspected(undefined);
    setConfirmingArrange(false);
    beginArranging();
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
    const cards = result.jumper
      ? ([
          ["primary", result.primary],
          ["jumper", result.jumper],
        ] as const)
      : ([["primary", result.primary]] as const);

    return cards.map(([role, instance]) => {
      const card = deck.getCard(instance.cardId);
      const inFlight = dealer.flights.some(
        (flight) => flight.positionId === position.id && flight.role === role,
      );
      return card ? (
        <DrawnCard
          key={instance.instanceId}
          card={card}
          instance={instance}
          role={role}
          positionIndex={position.index}
          interactive={!inFlight && abilities.canPlay}
          inFlight={inFlight}
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
      style={motionTimingStyle()}
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
          {/* The question comes first: dealing needs it. */}
          <div className="draw-table__question">
            <MainQuestionField
              value={spread.mainQuestion}
              onChange={(text) => dispatch({ type: "main-question", text })}
            />
          </div>
        </div>

        <p className="spread-notice" role="status">
          {state.notice?.text}
        </p>

        <div className="spread-setup">
          {!arranging && (
            <section className="template-shelf" aria-label="選擇牌陣">
              <SpreadPicker
                library={state.library}
                activeTemplateId={spread.templateId}
                disabled={filled > 0 || dealer.layoutLocked}
                onApply={(templateId) =>
                  dispatch({ type: "apply-template", templateId })
                }
              />
            </section>
          )}
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
            onAdd={() =>
              dispatch({
                type: "add",
                near: visibleCenter(viewportRef.current, fieldRef.current),
              })
            }
            canClear={dealer.canClear}
            onClear={session.clear}
          />
        </div>

        <div className="draw-table__stage spread-stage">
          <SpreadBoard
            spread={spread}
            selectedId={selectedId}
            arrangeable={abilities.canArrange}
            awaitingIds={dealer.awaitingIds}
            viewport={viewport}
            viewportRef={viewportRef}
            fieldRef={fieldRef}
            renderCards={renderCards}
            onSelect={handleSelect}
            onMove={handleMove}
            onNudge={handleNudge}
            onRotate={handleRotate}
            overlay={
              arranging ? undefined : (
                <TableDeck
                  shuffling={dealer.phase === "shuffling"}
                  holding={dealer.holding}
                  gathering={dealer.gathering}
                  washSeed={dealer.washSeed}
                  fan={dealer.fan}
                  nextPositionIndex={dealer.next?.index}
                  onTable={dealer.deckOnTable}
                  remaining={dealer.remaining}
                  total={dealer.total}
                  canShuffle={dealer.canShuffle && abilities.canPlay}
                  label={
                    dealer.canShuffle && abilities.canPlay
                      ? "按住牌堆洗牌"
                      : `牌堆：${status}`
                  }
                  backUrl={cardBackUrl(deck.id)}
                  hold={shuffleHold}
                  onPick={dealer.pick}
                />
              )
            }
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
      {confirmingArrange && (
        <ConfirmDialog
          title="清除這次的抽牌結果？"
          message="編輯牌陣前，會先把這次抽到的牌收回牌堆，解讀也會一起清除。牌位、問題和主問題都會保留。"
          confirmLabel="清除並編輯"
          onConfirm={arrangeAfterClearing}
          onCancel={() => setConfirmingArrange(false)}
        />
      )}
      {confirmingLeave && leaveTarget && (
        <ConfirmDialog
          title="牌陣還沒儲存"
          message={
            leaveTarget.kind === "template"
              ? `離開後，剛才的修改會還原成牌陣庫裡的「${leaveTarget.template.name}」。確定要離開嗎？`
              : "離開後，剛才的修改會還原成開始編輯前的牌陣。確定要離開嗎？"
          }
          confirmLabel="確定離開"
          onConfirm={discardArranging}
          onCancel={() => setConfirmingLeave(false)}
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
