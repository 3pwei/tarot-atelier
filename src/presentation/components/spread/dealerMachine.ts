import type { DrawState } from "@/domain/deck/draw";
import {
  beginShuffle,
  continueDrawing,
  reveal,
  type DrawPile,
} from "@/domain/deck/drawPile";
import { collectDrawnInstances } from "@/domain/spread/round";
import { dealingIssues } from "@/domain/spread/spread";
import type { Spread, SpreadPosition } from "@/domain/spread/types";
import {
  openFan,
  takeSlots,
  type CardFan,
} from "@/presentation/components/draw/cardFan";
import type { Flight } from "@/presentation/components/spread/useDealFlights";

/**
 * Where the dealer is in a round. The pile's own `state` says what the draw
 * rules allow; the stage says what the table is showing.
 */
export type DealerStage =
  /** The pack lies still; it can be held when the table allows. */
  | { readonly kind: "waiting" }
  /** The pack is held: the cards wash across the table. */
  | { readonly kind: "washing" }
  /** Let go: the wash floats down and, when animated, gathers into one heap. */
  | { readonly kind: "gathering"; readonly animated: boolean }
  /** The wheel is out and takes a pick for each position, in number order. */
  | {
      readonly kind: "picking";
      readonly fan: CardFan;
      /** Positions to fill from this fan, counted when it opened. */
      readonly roundTotal: number;
    };

export interface DealerState {
  /** The spread generation this pile was made for. */
  readonly generation: number;
  readonly pile: DrawPile;
  readonly stage: DealerStage;
  /** Changes on every shuffle, so each wash takes new paths. */
  readonly washSeed: number;
  /** Cards on their way from the wheel to the table. */
  readonly flights: readonly Flight[];
}

export type DealerEvent =
  /** The spread was restored or cleared: a fresh pile without its table cards. */
  | {
      readonly type: "reset";
      readonly generation: number;
      readonly pile: DrawPile;
    }
  | { readonly type: "hold" }
  | { readonly type: "release"; readonly animated: boolean }
  /** The wash is over and `pile` is its shuffled result. */
  | {
      readonly type: "gathered";
      readonly pile: DrawPile;
      readonly roundTotal: number;
    }
  /**
   * A card was chosen: `pile` is the pile after the draw, `slots` the wheel
   * slots that left (the chosen one and any jumper).
   */
  | {
      readonly type: "picked";
      readonly pile: DrawPile;
      readonly slots: readonly number[];
      readonly positionsLeft: number;
      readonly flights: readonly Flight[];
    }
  | { readonly type: "landed"; readonly flight: Flight };

export function initialDealerState(
  pile: DrawPile,
  generation: number,
): DealerState {
  return {
    generation,
    pile,
    stage: { kind: "waiting" },
    washSeed: generation + 1,
    flights: [],
  };
}

/** The dealer's transitions. Pure: randomness is applied before an event is sent. */
export function dealerReducer(
  state: DealerState,
  event: DealerEvent,
): DealerState {
  switch (event.type) {
    case "reset":
      return {
        ...state,
        generation: event.generation,
        pile: event.pile,
        stage: { kind: "waiting" },
        flights: [],
      };
    case "hold": {
      if (state.stage.kind !== "waiting") return state;
      const shuffling = beginShuffle(state.pile);
      if (!shuffling.ok) return state;
      return {
        ...state,
        pile: shuffling.value,
        stage: { kind: "washing" },
        washSeed: state.washSeed + 1,
      };
    }
    case "release":
      if (state.stage.kind !== "washing") return state;
      return {
        ...state,
        stage: { kind: "gathering", animated: event.animated },
      };
    case "gathered":
      if (state.stage.kind !== "gathering") return state;
      return {
        ...state,
        pile: event.pile,
        stage: {
          kind: "picking",
          fan: openFan(event.pile.remainingCardIds.length),
          roundTotal: event.roundTotal,
        },
      };
    case "picked":
      return picked(state, event);
    case "landed":
      return {
        ...state,
        flights: state.flights.filter((flight) => flight !== event.flight),
      };
  }
}

function picked(
  state: DealerState,
  event: Extract<DealerEvent, { type: "picked" }>,
): DealerState {
  if (state.stage.kind !== "picking") return state;
  const revealed = reveal(event.pile);
  if (!revealed.ok) return state;
  const flights = [...state.flights, ...event.flights];
  const pileLeft = revealed.value.remainingCardIds.length > 0;
  if (event.positionsLeft === 0 || !pileLeft) {
    return {
      ...state,
      pile: revealed.value,
      stage: { kind: "waiting" },
      flights,
    };
  }
  const next = continueDrawing(revealed.value);
  if (!next.ok) return state;
  return {
    ...state,
    pile: next.value,
    stage: { ...state.stage, fan: takeSlots(state.stage.fan, event.slots) },
    flights,
  };
}

/** What the dealer reads from the table around it. */
export interface TableFacts {
  readonly spread: Spread;
  readonly revealedInstanceIds: ReadonlySet<string>;
  readonly loading: boolean;
}

/** Everything the table shows and allows, worked out from the state alone. */
export interface DealerView {
  readonly phase: DrawState;
  readonly holding: boolean;
  /** The washed cards sweep into one heap (animated motion only). */
  readonly gathering: boolean;
  /** The wheel takes picks. */
  readonly picking: boolean;
  readonly remaining: number;
  /** The next empty position, which gets the next chosen card. */
  readonly next?: SpreadPosition;
  readonly emptyCount: number;
  readonly allRevealed: boolean;
  /** Cards are still to be chosen, or still on their way to the table. */
  readonly dealing: boolean;
  readonly canShuffle: boolean;
  /** The pack stays on the table only while it still has positions to fill. */
  readonly deckOnTable: boolean;
  /** Starting over works at any moment but mid-wash or mid-flight. */
  readonly canClear: boolean;
  readonly layoutLocked: boolean;
  /** Positions whose chosen card is still on its way; they keep their number. */
  readonly awaitingIds: readonly string[];
  /** What the table is doing, in words, for the status line. */
  readonly status: string;
}

export function dealerView(state: DealerState, facts: TableFacts): DealerView {
  const { spread, revealedInstanceIds, loading } = facts;
  const { pile, stage, flights } = state;
  const phase = pile.state;
  const remaining = pile.remainingCardIds.length;
  const empty = spread.positions.filter((position) => !position.drawResult);
  const next = empty[0];
  const allRevealed = collectDrawnInstances(spread).every((card) =>
    revealedInstanceIds.has(card.instanceId),
  );
  const blocker = spreadBlocker(spread);
  const flying = flights.length > 0;
  const picking = stage.kind === "picking";
  const canShuffle =
    !loading &&
    !blocker &&
    Boolean(next) &&
    remaining > 0 &&
    allRevealed &&
    !flying &&
    stage.kind === "waiting";
  return {
    phase,
    holding: stage.kind === "washing",
    gathering: stage.kind === "gathering" && stage.animated,
    picking,
    remaining,
    ...(next ? { next } : {}),
    emptyCount: empty.length,
    allRevealed,
    dealing: Boolean(next) || flying,
    canShuffle,
    deckOnTable: Boolean(next) && remaining > 0,
    canClear: !loading && phase !== "shuffling" && !flying,
    layoutLocked: loading || phase === "shuffling" || picking || flying,
    awaitingIds: flights
      .filter((flight) => flight.role === "primary")
      .map((flight) => flight.positionId),
    status: dealerStatus({
      loading,
      stage,
      phase,
      emptyCount: empty.length,
      flying,
      allRevealed,
      remaining,
      ...(blocker ? { blocker } : {}),
    }),
  };
}

/** Why the spread cannot be dealt yet, in the player's words. */
export function spreadBlocker(spread: Spread): string | undefined {
  const first = dealingIssues(spread)[0];
  if (!first) return undefined;
  switch (first.code) {
    case "no-positions":
      return "請按「編輯牌陣」新增至少一個牌位";
    case "missing-question":
      return `請按「編輯牌陣」為牌位 ${first.index} 設定問題`;
    case "question-too-long":
      return `牌位 ${first.index} 的問題超過 300 字`;
    case "too-many-positions":
      return "牌位最多 12 個";
    case "main-question-too-long":
      return "主問題超過 300 字";
    case "missing-main-question":
      return "請先輸入這次想問的主問題";
  }
}

function dealerStatus(table: {
  readonly loading: boolean;
  readonly stage: DealerStage;
  readonly phase: DrawState;
  readonly emptyCount: number;
  readonly flying: boolean;
  readonly allRevealed: boolean;
  readonly remaining: number;
  readonly blocker?: string;
}): string {
  const { loading, stage, phase, emptyCount, flying, allRevealed } = table;
  if (loading) return "正在讀取牌陣";
  if (stage.kind === "washing") return "洗牌中，放開後收牌攤開";
  if (phase === "shuffling") return "正在洗牌";
  if (stage.kind === "picking") {
    const pickNumber = stage.roundTotal - emptyCount + 1;
    return `請選第 ${pickNumber} 張（共 ${stage.roundTotal} 張）：點一下讓牌往前，再往前拉出`;
  }
  if (flying) return "牌正在放到牌位";
  if (!allRevealed) return "點擊卡牌，以火焰逐一揭示牌面";
  if (table.blocker) return table.blocker;
  if (emptyCount === 0) return "牌陣已完成";
  if (table.remaining === 0) return "牌堆已用盡";
  if (phase === "idle") return "準備好了，按住牌桌洗牌";
  return `按住牌桌洗牌，再選 ${emptyCount} 張牌`;
}
