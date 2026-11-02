import type { DrawResult } from "@/domain/deck/draw";
import { createSpreadFromPreset } from "@/domain/spread/presets";
import {
  addPosition,
  assignDraw,
  hasDraws,
  movePosition,
  nudgePosition,
  removePosition,
  reorderPosition,
  rotatePosition,
  setMainQuestion,
  setPositionQuestion,
  suggestPlacement,
  type SpreadUpdate,
} from "@/domain/spread/spread";
import {
  MAX_SPREAD_POSITIONS,
  type Spread,
  type SpreadPresetId,
  type TablePoint,
} from "@/domain/spread/types";

/** Client interaction state around the pure domain spread. */
export interface SpreadUiState {
  readonly spread: Spread;
  readonly revealedInstanceIds: ReadonlySet<string>;
  readonly selectedId?: string;
  /** False until the saved session has been read in the browser. */
  readonly hydrated: boolean;
  /** Bumps when the spread is restored or cleared, so the pile resets. */
  readonly generation: number;
  /** Latest announcement; `id` changes so repeats are re-announced. */
  readonly notice?: { readonly id: number; readonly text: string };
}

export type SpreadAction =
  | {
      readonly type: "hydrate";
      readonly restored?: {
        readonly spread: Spread;
        readonly revealedInstanceIds: readonly string[];
      };
      readonly notice?: string;
    }
  | { readonly type: "preset"; readonly presetId: SpreadPresetId }
  | { readonly type: "add"; readonly near: TablePoint }
  | { readonly type: "remove"; readonly positionId: string }
  | {
      readonly type: "move";
      readonly positionId: string;
      readonly point: TablePoint;
    }
  | {
      readonly type: "nudge";
      readonly positionId: string;
      readonly delta: TablePoint;
    }
  | {
      readonly type: "rotate";
      readonly positionId: string;
      readonly degrees: number;
    }
  | {
      readonly type: "question";
      readonly positionId: string;
      readonly text: string;
    }
  | { readonly type: "main-question"; readonly text: string }
  | {
      readonly type: "reorder";
      readonly positionId: string;
      readonly index: number;
    }
  | {
      readonly type: "draw";
      readonly positionId: string;
      readonly result: DrawResult;
    }
  | { readonly type: "revealed"; readonly instanceId: string }
  | { readonly type: "select"; readonly positionId?: string }
  | { readonly type: "clear" }
  | { readonly type: "announce"; readonly text: string };

export type CreateId = () => string;

/**
 * Deterministic IDs for the first render, so server HTML and hydration match.
 * They are replaced with real IDs as soon as the browser takes over.
 */
export function createHydrationIds(): CreateId {
  let next = 0;
  return () => `hydrating-${(next += 1)}`;
}

export function createInitialState(
  createId: CreateId,
  presetId: SpreadPresetId = "three-card",
): SpreadUiState {
  return {
    spread: createSpreadFromPreset({ presetId, createId }),
    revealedInstanceIds: new Set(),
    hydrated: false,
    generation: 0,
  };
}

function announce(
  state: SpreadUiState,
  text: string,
  previous: SpreadUiState = state,
): SpreadUiState {
  return { ...state, notice: { id: (previous.notice?.id ?? 0) + 1, text } };
}

const RULE_MESSAGES = {
  "position-limit": `牌位最多 ${MAX_SPREAD_POSITIONS} 個，請先移除一個再新增。`,
  "position-drawn": "這個牌位已有抽牌結果，不能移除或重抽；可移動或旋轉它。",
  "unknown-position": "找不到這個牌位，請重新選取。",
  "invalid-index": "排序超出範圍。",
} as const;

function applyUpdate(
  state: SpreadUiState,
  update: SpreadUpdate,
): SpreadUiState {
  if (!update.ok) return announce(state, RULE_MESSAGES[update.code]);
  return { ...state, spread: update.spread };
}

function positionIndex(
  state: SpreadUiState,
  positionId: string,
): number | undefined {
  return state.spread.positions.find((position) => position.id === positionId)
    ?.index;
}

function describeRenumbering(
  removedIndex: number,
  renumbered: readonly { from: number; to: number }[],
): string {
  if (renumbered.length === 0) return `已移除牌位 ${removedIndex}。`;
  const first = renumbered[0];
  const last = renumbered.at(-1);
  const range =
    renumbered.length === 1 || !first || !last
      ? `原牌位 ${first?.from} 改為 ${first?.to}`
      : `原牌位 ${first.from}–${last.from} 依序改為 ${first.to}–${last.to}`;
  return `已移除牌位 ${removedIndex}，${range}。`;
}

export function createSpreadReducer(createId: CreateId) {
  return function spreadReducer(
    state: SpreadUiState,
    action: SpreadAction,
  ): SpreadUiState {
    switch (action.type) {
      case "hydrate": {
        const next: SpreadUiState = {
          ...state,
          ...(action.restored
            ? {
                spread: action.restored.spread,
                revealedInstanceIds: new Set(
                  action.restored.revealedInstanceIds,
                ),
              }
            : createInitialState(createId)),
          selectedId: undefined,
          hydrated: true,
          generation: state.generation + 1,
        };
        return action.notice ? announce(next, action.notice) : next;
      }
      case "preset": {
        if (hasDraws(state.spread)) {
          return announce(state, "已有抽牌結果；請先清除本次牌陣再換牌陣。");
        }
        const spread = createSpreadFromPreset({
          presetId: action.presetId,
          createId,
          mainQuestion: state.spread.mainQuestion,
        });
        return announce(
          { ...state, spread, selectedId: undefined },
          action.presetId === "custom"
            ? "已切換為完全自訂，請新增牌位。"
            : `已套用範例，共 ${spread.positions.length} 個牌位。`,
        );
      }
      case "add": {
        const id = createId();
        const update = addPosition(state.spread, {
          id,
          question: "",
          ...suggestPlacement(state.spread, action.near),
        });
        if (!update.ok) return applyUpdate(state, update);
        const index = update.spread.positions.length;
        return announce(
          { ...state, spread: update.spread, selectedId: id },
          `已新增牌位 ${index}，請為它設定問題。`,
        );
      }
      case "remove": {
        const removal = removePosition(state.spread, action.positionId);
        if (!removal.ok) return announce(state, RULE_MESSAGES[removal.code]);
        return announce(
          {
            ...state,
            spread: removal.spread,
            selectedId:
              state.selectedId === action.positionId
                ? undefined
                : state.selectedId,
          },
          describeRenumbering(removal.removedIndex, removal.renumbered),
        );
      }
      case "move":
        return applyUpdate(
          state,
          movePosition(state.spread, action.positionId, action.point),
        );
      case "nudge":
        return applyUpdate(
          state,
          nudgePosition(state.spread, action.positionId, action.delta),
        );
      case "rotate":
        return applyUpdate(
          state,
          rotatePosition(state.spread, action.positionId, action.degrees),
        );
      case "question":
        return applyUpdate(
          state,
          setPositionQuestion(state.spread, action.positionId, action.text),
        );
      case "main-question":
        return { ...state, spread: setMainQuestion(state.spread, action.text) };
      case "reorder": {
        const before = positionIndex(state, action.positionId);
        const next = applyUpdate(
          state,
          reorderPosition(state.spread, action.positionId, action.index),
        );
        return next.spread === state.spread || before === action.index
          ? next
          : announce(
              next,
              `牌位 ${before} 已移到第 ${action.index} 號，其餘依序調整。`,
            );
      }
      case "draw":
        return applyUpdate(
          state,
          assignDraw(state.spread, action.positionId, action.result),
        );
      case "revealed": {
        if (state.revealedInstanceIds.has(action.instanceId)) return state;
        const revealed = new Set(state.revealedInstanceIds);
        revealed.add(action.instanceId);
        return { ...state, revealedInstanceIds: revealed };
      }
      case "select":
        return { ...state, selectedId: action.positionId };
      case "clear":
        return announce(
          {
            ...createInitialState(createId),
            hydrated: true,
            generation: state.generation + 1,
          },
          "已清除本次牌陣，重新從經典三張開始。",
          state,
        );
      case "announce":
        return announce(state, action.text);
    }
  };
}
