import type { DrawResult } from "@/domain/deck/draw";
import {
  addPosition,
  assignDraw,
  clearDraws,
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
  BUILT_IN_TEMPLATES,
  createBlankSpread,
  createSpreadFromTemplate,
  defaultTemplate,
  deleteTemplate,
  restoreBuiltIns,
  saveTemplate,
  type TemplateLibrary,
  type TemplateRuleCode,
} from "@/domain/spread/templates";
import {
  MAX_SAVED_TEMPLATES,
  MAX_SPREAD_POSITIONS,
  MAX_TEMPLATE_NAME_LENGTH,
  type Spread,
  type TablePoint,
} from "@/domain/spread/types";

/** Client interaction state around the pure domain spread. */
export interface SpreadUiState {
  readonly spread: Spread;
  readonly library: TemplateLibrary;
  readonly revealedInstanceIds: ReadonlySet<string>;
  readonly selectedId?: string;
  /** False until saved data has been read in the browser. */
  readonly hydrated: boolean;
  /** Bumps when the spread is restored or cleared, so the pile resets. */
  readonly generation: number;
  /** Latest announcement; `id` changes so repeats are re-announced. */
  readonly notice?: { readonly id: number; readonly text: string };
}

export interface DealtPosition {
  readonly positionId: string;
  readonly result: DrawResult;
}

export type SpreadAction =
  | {
      readonly type: "hydrate";
      readonly library: TemplateLibrary;
      readonly restored?: {
        readonly spread: Spread;
        readonly revealedInstanceIds: readonly string[];
      };
      readonly notice?: string;
    }
  | { readonly type: "apply-template"; readonly templateId: string }
  | { readonly type: "blank" }
  | { readonly type: "save-template"; readonly name: string }
  | { readonly type: "delete-template"; readonly templateId: string }
  | { readonly type: "restore-templates" }
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
  | { readonly type: "deal"; readonly dealt: readonly DealtPosition[] }
  | { readonly type: "revealed"; readonly instanceId: string }
  | { readonly type: "select"; readonly positionId?: string }
  | { readonly type: "clear" }
  /** Returns the drawn cards so the layout can be edited again. */
  | { readonly type: "clear-draws" }
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

/** A fresh reading from the library's first template, or a blank table. */
function freshSpread(library: TemplateLibrary, createId: CreateId): Spread {
  const template = defaultTemplate(library);
  return template
    ? createSpreadFromTemplate({ template, createId })
    : createBlankSpread({ createId });
}

export function createInitialState(
  createId: CreateId,
  library: TemplateLibrary = BUILT_IN_TEMPLATES,
): SpreadUiState {
  return {
    spread: freshSpread(library, createId),
    library,
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

const TEMPLATE_MESSAGES: Readonly<Record<TemplateRuleCode, string>> = {
  "name-required": "請輸入牌陣名稱。",
  "name-too-long": `牌陣名稱最多 ${MAX_TEMPLATE_NAME_LENGTH} 字。`,
  "no-positions": "牌桌上至少要有一個牌位才能儲存。",
  "library-full": `牌陣庫最多 ${MAX_SAVED_TEMPLATES} 個，請先刪除一個。`,
  "unknown-template": "找不到這個牌陣，請重新選擇。",
};

const LOCKED_BY_DRAWS =
  "已有抽牌結果；請按「完成編輯」，在抽牌畫面清除本次牌陣後再換牌陣。";

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

function reduceTemplates(
  state: SpreadUiState,
  action: Extract<
    SpreadAction,
    {
      type:
        | "apply-template"
        | "blank"
        | "save-template"
        | "delete-template"
        | "restore-templates";
    }
  >,
  createId: CreateId,
): SpreadUiState {
  switch (action.type) {
    case "apply-template": {
      if (hasDraws(state.spread)) return announce(state, LOCKED_BY_DRAWS);
      const template = state.library.find((t) => t.id === action.templateId);
      if (!template)
        return announce(state, TEMPLATE_MESSAGES["unknown-template"]);
      const spread = createSpreadFromTemplate({
        template,
        createId,
        mainQuestion: state.spread.mainQuestion,
      });
      return announce(
        { ...state, spread, selectedId: undefined },
        `已套用「${template.name}」，共 ${spread.positions.length} 個牌位。`,
      );
    }
    case "blank": {
      if (hasDraws(state.spread)) return announce(state, LOCKED_BY_DRAWS);
      return announce(
        {
          ...state,
          spread: createBlankSpread({
            createId,
            mainQuestion: state.spread.mainQuestion,
          }),
          selectedId: undefined,
        },
        "已換成空白牌桌，請新增牌位。",
      );
    }
    case "save-template": {
      const saved = saveTemplate(state.library, {
        spread: state.spread,
        name: action.name,
        createId,
      });
      if (!saved.ok) return announce(state, TEMPLATE_MESSAGES[saved.code]);
      return announce(
        {
          ...state,
          library: saved.library,
          spread: { ...state.spread, templateId: saved.template.id },
        },
        saved.replaced
          ? `已更新牌陣庫裡的「${saved.template.name}」。`
          : `已把目前牌陣存成「${saved.template.name}」。`,
      );
    }
    case "delete-template": {
      const template = state.library.find((t) => t.id === action.templateId);
      const removal = deleteTemplate(state.library, action.templateId);
      if (!removal.ok || !template) {
        return announce(state, TEMPLATE_MESSAGES["unknown-template"]);
      }
      return announce(
        { ...state, library: removal.library },
        template.builtIn
          ? `已刪除「${template.name}」，可用「還原預設範例」找回。`
          : `已刪除「${template.name}」。牌桌上目前的牌位不受影響。`,
      );
    }
    case "restore-templates":
      return announce(
        { ...state, library: restoreBuiltIns(state.library) },
        "已還原預設範例。",
      );
  }
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
          library: action.library,
          spread:
            action.restored?.spread ?? freshSpread(action.library, createId),
          revealedInstanceIds: new Set(
            action.restored?.revealedInstanceIds ?? [],
          ),
          selectedId: undefined,
          hydrated: true,
          generation: state.generation + 1,
        };
        return action.notice ? announce(next, action.notice) : next;
      }
      case "apply-template":
      case "blank":
      case "save-template":
      case "delete-template":
      case "restore-templates":
        return reduceTemplates(state, action, createId);
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
      case "deal": {
        let spread = state.spread;
        for (const { positionId, result } of action.dealt) {
          const update = assignDraw(spread, positionId, result);
          if (!update.ok) return announce(state, RULE_MESSAGES[update.code]);
          spread = update.spread;
        }
        return { ...state, spread };
      }
      case "revealed": {
        if (state.revealedInstanceIds.has(action.instanceId)) return state;
        const revealed = new Set(state.revealedInstanceIds);
        revealed.add(action.instanceId);
        return { ...state, revealedInstanceIds: revealed };
      }
      case "select":
        return { ...state, selectedId: action.positionId };
      case "clear": {
        const first = defaultTemplate(state.library);
        return announce(
          {
            ...createInitialState(createId, state.library),
            hydrated: true,
            generation: state.generation + 1,
          },
          first
            ? `已清除本次牌陣，重新從「${first.name}」開始。`
            : "已清除本次牌陣，從空白牌桌開始。",
          state,
        );
      }
      case "clear-draws":
        return announce(
          {
            ...state,
            spread: clearDraws(state.spread),
            revealedInstanceIds: new Set(),
            selectedId: undefined,
            generation: state.generation + 1,
          },
          "已清除這次的抽牌結果，可以編輯牌陣了。",
          state,
        );
      case "announce":
        return announce(state, action.text);
    }
  };
}
