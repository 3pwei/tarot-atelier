import { describe, expect, it } from "vitest";
import {
  completeShuffle,
  createDrawPile,
  drawAt,
  type DrawPile,
  type DrawPileStep,
} from "@/domain/deck/drawPile";
import {
  fixtureDraw,
  fixtureSpread,
} from "@/domain/history/testing/historyFixtures";
import type { Spread } from "@/domain/spread/types";
import {
  dealerReducer,
  dealerView,
  initialDealerState,
  spreadBlocker,
  type DealerEvent,
  type DealerState,
} from "@/presentation/components/spread/dealerMachine";
import type { Flight } from "@/presentation/components/spread/useDealFlights";

const random = () => 0.999;
const now = () => new Date("2026-11-23T00:00:00.000Z");

function must<Value>(step: DrawPileStep<Value>): Value {
  if (!step.ok) throw new Error(step.issue.code);
  return step.value;
}

function pileOf(cardIds: readonly string[]): DrawPile {
  return must(
    createDrawPile({
      deckId: "deck",
      cardIds,
      supportsReversals: false,
      jumperMode: "off",
    }),
  );
}

const twoPositions = fixtureSpread({
  mainQuestion: "這段時間的方向？",
  questions: ["現在", "接下來"],
  draws: [],
});

function facts(
  spread: Spread = twoPositions,
  revealed: readonly string[] = [],
) {
  return {
    spread,
    revealedInstanceIds: new Set(revealed),
    loading: false,
  };
}

function run(state: DealerState, ...events: readonly DealerEvent[]) {
  return events.reduce(dealerReducer, state);
}

/** Held, let go and gathered: the wheel is out for `roundTotal` positions. */
function picking(cardIds = ["a", "b", "c"], roundTotal = 2): DealerState {
  const washing = run(initialDealerState(pileOf(cardIds), 0), { type: "hold" });
  const gathering = run(washing, { type: "release", animated: true });
  return run(gathering, {
    type: "gathered",
    pile: must(completeShuffle(washing.pile, random)),
    roundTotal,
  });
}

function pickEvent(
  state: DealerState,
  slot: number,
  positionsLeft: number,
  flights: readonly Flight[] = [],
): DealerEvent {
  const { pile } = must(drawAt(state.pile, slot, { random, now }));
  return { type: "picked", pile, slots: [slot], positionsLeft, flights };
}

describe("dealer state machine", () => {
  it("starts waiting with an idle pile, ready to shuffle", () => {
    const state = initialDealerState(pileOf(["a", "b"]), 4);
    const view = dealerView(state, facts());

    expect(state.stage).toEqual({ kind: "waiting" });
    expect(view.phase).toBe("idle");
    expect(view.canShuffle).toBe(true);
    expect(view.status).toBe("準備好了，按住牌桌洗牌");
    expect(state.washSeed).toBe(5);
  });

  it("washes while held, with a new wash each time", () => {
    const start = initialDealerState(pileOf(["a", "b"]), 0);
    const washing = run(start, { type: "hold" });
    const view = dealerView(washing, facts());

    expect(washing.stage).toEqual({ kind: "washing" });
    expect(washing.pile.state).toBe("shuffling");
    expect(washing.washSeed).toBe(start.washSeed + 1);
    expect(view.holding).toBe(true);
    expect(view.layoutLocked).toBe(true);
    expect(view.canClear).toBe(false);
    expect(view.status).toBe("洗牌中，放開後收牌攤開");
  });

  it("gathers only when let go, and sweeps the heap only when animated", () => {
    const washing = run(initialDealerState(pileOf(["a", "b"]), 0), {
      type: "hold",
    });

    const animated = run(washing, { type: "release", animated: true });
    const still = run(washing, { type: "release", animated: false });

    expect(dealerView(animated, facts()).gathering).toBe(true);
    expect(dealerView(still, facts()).gathering).toBe(false);
    expect(dealerView(still, facts()).status).toBe("正在洗牌");
  });

  it("ignores letting go when nothing is held", () => {
    const waiting = initialDealerState(pileOf(["a"]), 0);
    expect(run(waiting, { type: "release", animated: true })).toBe(waiting);
  });

  it("opens the wheel with every remaining card once the wash is over", () => {
    const state = picking(["a", "b", "c"], 2);
    const view = dealerView(state, facts());

    expect(state.stage).toMatchObject({ kind: "picking", roundTotal: 2 });
    expect(state.stage.kind === "picking" && state.stage.fan.size).toBe(3);
    expect(view.picking).toBe(true);
    expect(view.canShuffle).toBe(false);
    expect(view.status).toBe(
      "請選第 1 張（共 2 張）：點一下讓牌往前，再往前拉出",
    );
  });

  it("keeps the wheel out after a pick while positions are left, minus the taken slot", () => {
    const state = picking();
    const after = run(state, pickEvent(state, 1, 1));

    expect(after.pile.state).toBe("ready");
    expect(after.stage.kind).toBe("picking");
    expect(
      after.stage.kind === "picking" && [...after.stage.fan.taken],
    ).toEqual([1]);
  });

  it("puts the wheel away after the last pick", () => {
    const state = picking(["a", "b", "c"], 1);
    const after = run(state, pickEvent(state, 0, 0));

    expect(after.stage).toEqual({ kind: "waiting" });
    expect(after.pile.state).toBe("revealed");
  });

  it("puts the wheel away when the pile runs out before the positions do", () => {
    const state = picking(["a"], 2);
    const after = run(state, pickEvent(state, 0, 1));

    expect(after.stage).toEqual({ kind: "waiting" });
    expect(dealerView(after, facts()).remaining).toBe(0);
  });

  it("tracks cards in flight until each lands, and locks the table meanwhile", () => {
    const flight: Flight = {
      positionId: "p1",
      role: "primary",
      origin: { left: 0, top: 0, width: 10, height: 16 },
    };
    const state = picking();
    const flying = run(state, pickEvent(state, 0, 1, [flight]));
    const view = dealerView(flying, facts());

    expect(view.awaitingIds).toEqual(["p1"]);
    expect(view.canClear).toBe(false);
    expect(run(flying, { type: "landed", flight }).flights).toEqual([]);
  });

  it("starts over with a fresh pile when the spread is restored or cleared", () => {
    const state = picking();
    const reset = run(state, {
      type: "reset",
      generation: 7,
      pile: pileOf(["x"]),
    });

    expect(reset.generation).toBe(7);
    expect(reset.stage).toEqual({ kind: "waiting" });
    expect(reset.pile.remainingCardIds).toEqual(["x"]);
    expect(reset.washSeed).toBe(state.washSeed);
  });

  it("does not shuffle mid-round", () => {
    const state = picking();
    expect(run(state, { type: "hold" })).toBe(state);
  });
});

describe("what the table allows", () => {
  it("asks for the main question before dealing", () => {
    const unasked = fixtureSpread({ questions: ["現在"], draws: [] });
    const view = dealerView(
      initialDealerState(pileOf(["a"]), 0),
      facts(unasked),
    );

    expect(view.canShuffle).toBe(false);
    expect(view.status).toBe("請先輸入這次想問的主問題");
  });

  it("waits for every drawn card to be revealed", () => {
    const drawn = fixtureSpread({
      mainQuestion: "方向？",
      questions: ["現在", "接下來"],
      draws: [fixtureDraw({ drawNumber: 1, cardId: "a" })],
    });
    const state = initialDealerState(pileOf(["b", "c"]), 0);
    const instanceId = drawn.positions[0]!.drawResult!.primary.instanceId;

    expect(dealerView(state, facts(drawn)).status).toBe(
      "點擊卡牌，以火焰逐一揭示牌面",
    );
    const revealed = dealerView(state, facts(drawn, [instanceId]));
    expect(revealed.canShuffle).toBe(true);
    expect(revealed.status).toBe("準備好了，按住牌桌洗牌");
  });

  it("calls the spread complete when every position has its card", () => {
    const done = fixtureSpread({
      mainQuestion: "方向？",
      questions: ["現在"],
      draws: [fixtureDraw({ drawNumber: 1, cardId: "a" })],
    });
    const instanceId = done.positions[0]!.drawResult!.primary.instanceId;
    const view = dealerView(
      initialDealerState(pileOf(["b"]), 0),
      facts(done, [instanceId]),
    );

    expect(view.status).toBe("牌陣已完成");
    expect(view.deckOnTable).toBe(false);
    expect(view.canShuffle).toBe(false);
  });

  it("says when the pile is used up", () => {
    const view = dealerView(initialDealerState(pileOf([]), 0), facts());
    expect(view.status).toBe("牌堆已用盡");
    expect(view.canShuffle).toBe(false);
  });

  it("says it is loading and locks everything until the spread is read", () => {
    const view = dealerView(initialDealerState(pileOf(["a"]), 0), {
      ...facts(),
      loading: true,
    });
    expect(view.status).toBe("正在讀取牌陣");
    expect(view.canShuffle).toBe(false);
    expect(view.layoutLocked).toBe(true);
  });

  it("names the first problem that stops a spread from being dealt", () => {
    expect(
      spreadBlocker(
        fixtureSpread({ mainQuestion: "方向？", questions: [], draws: [] }),
      ),
    ).toBe("請按「編輯牌陣」新增至少一個牌位");
    expect(
      spreadBlocker(
        fixtureSpread({
          mainQuestion: "方向？",
          questions: ["現在", ""],
          draws: [],
        }),
      ),
    ).toBe("請按「編輯牌陣」為牌位 2 設定問題");
    expect(spreadBlocker(twoPositions)).toBeUndefined();
  });
});
