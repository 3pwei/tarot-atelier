import { describe, expect, it } from "vitest";
import type { DrawResult } from "@/domain/deck/draw";
import {
  addPosition,
  assignDraw,
  canAddPosition,
  clearDraws,
  countCharacters,
  createSpread,
  dealingIssues,
  isSpreadReady,
  movePosition,
  nextPositionToDraw,
  nudgePosition,
  normalizeRotation,
  removePosition,
  reorderPosition,
  rotatePosition,
  setMainQuestion,
  setPositionQuestion,
  suggestPlacement,
  validateSpread,
  type SpreadUpdate,
} from "@/domain/spread/spread";
import {
  MAX_QUESTION_LENGTH,
  MAX_SPREAD_POSITIONS,
  type Spread,
} from "@/domain/spread/types";

function unwrap(update: SpreadUpdate): Spread {
  if (!update.ok) throw new Error(`Expected success, got ${update.code}`);
  return update.spread;
}

function spreadOf(count: number, question = "問題"): Spread {
  return createSpread({
    id: "spread",
    positions: Array.from({ length: count }, (_, order) => ({
      id: `p${order + 1}`,
      question,
      x: order / Math.max(1, count),
      y: 0.5,
    })),
  });
}

function draw(card: string, jumper?: string): DrawResult {
  return {
    primary: {
      instanceId: `deck:${card}`,
      deckId: "deck",
      cardId: card,
      orientation: "upright",
    },
    ...(jumper
      ? {
          jumper: {
            instanceId: `deck:${jumper}`,
            deckId: "deck",
            cardId: jumper,
            orientation: "reversed" as const,
          },
        }
      : {}),
    drawnAt: "2026-11-02T00:00:00.000Z",
  };
}

const indexes = (spread: Spread) =>
  spread.positions.map((position) => [position.id, position.index]);

describe("spread numbering", () => {
  it("numbers new positions after the last one", () => {
    const spread = unwrap(
      addPosition(spreadOf(2), { id: "new", question: "", x: 0.5, y: 0.5 }),
    );

    expect(indexes(spread)).toEqual([
      ["p1", 1],
      ["p2", 2],
      ["new", 3],
    ]);
    expect(spread.templateId).toBeUndefined();
  });

  it("closes gaps in order and reports every renumbered position", () => {
    const removal = removePosition(spreadOf(5), "p2");
    if (!removal.ok) throw new Error(removal.code);

    expect(removal.removedIndex).toBe(2);
    expect(indexes(removal.spread)).toEqual([
      ["p1", 1],
      ["p3", 2],
      ["p4", 3],
      ["p5", 4],
    ]);
    expect(removal.renumbered).toEqual([
      { from: 3, to: 2 },
      { from: 4, to: 3 },
      { from: 5, to: 4 },
    ]);
  });

  it("reports nothing renumbered when the last position goes", () => {
    const removal = removePosition(spreadOf(3), "p3");
    expect(removal.ok && removal.renumbered).toEqual([]);
  });

  it("reorders a position and shifts the others to stay 1..n", () => {
    const spread = unwrap(reorderPosition(spreadOf(4), "p4", 1));
    expect(indexes(spread)).toEqual([
      ["p4", 1],
      ["p1", 2],
      ["p2", 3],
      ["p3", 4],
    ]);
    expect(
      unwrap(reorderPosition(spread, "p4", 3)).positions.map((p) => p.id),
    ).toEqual(["p1", "p2", "p4", "p3"]);
  });

  it("rejects out-of-range or unknown reorders", () => {
    expect(reorderPosition(spreadOf(3), "p1", 4)).toEqual({
      ok: false,
      code: "invalid-index",
    });
    expect(reorderPosition(spreadOf(3), "p1", 1.5)).toEqual({
      ok: false,
      code: "invalid-index",
    });
    expect(reorderPosition(spreadOf(3), "nope", 1)).toEqual({
      ok: false,
      code: "unknown-position",
    });
  });
});

describe("template link", () => {
  it("keeps the template through edits but drops it when positions change", () => {
    const fromTemplate = createSpread({
      id: "s",
      templateId: "three-card",
      positions: [
        { id: "a", question: "q", x: 0.2, y: 0.5 },
        { id: "b", question: "q", x: 0.8, y: 0.5 },
      ],
    });
    const moved = unwrap(movePosition(fromTemplate, "a", { x: 0.3, y: 0.4 }));
    expect(moved.templateId).toBe("three-card");

    const added = unwrap(
      addPosition(fromTemplate, { id: "c", question: "", x: 0.5, y: 0.1 }),
    );
    expect(added.templateId).toBeUndefined();
    const removed = removePosition(fromTemplate, "b");
    expect(removed.ok && removed.spread.templateId).toBeUndefined();
  });
});

describe("spread limits", () => {
  it(`allows up to ${MAX_SPREAD_POSITIONS} positions and refuses the next`, () => {
    const full = spreadOf(MAX_SPREAD_POSITIONS);
    expect(canAddPosition(full)).toBe(false);
    expect(
      addPosition(full, { id: "extra", question: "x", x: 0, y: 0 }),
    ).toEqual({ ok: false, code: "position-limit" });
    expect(canAddPosition(spreadOf(MAX_SPREAD_POSITIONS - 1))).toBe(true);
  });

  it("refuses to build an oversized or duplicated spread", () => {
    expect(() => spreadOf(MAX_SPREAD_POSITIONS + 1)).toThrow(RangeError);
    expect(() =>
      createSpread({
        id: "s",
        positions: [
          { id: "a", question: "", x: 0, y: 0 },
          { id: "a", question: "", x: 0, y: 0 },
        ],
      }),
    ).toThrow(/unique/u);
  });
});

describe("required questions", () => {
  it("blocks drawing until every position has a question", () => {
    let spread = spreadOf(3, "");
    expect(isSpreadReady(spread)).toBe(false);
    expect(validateSpread(spread)).toEqual([
      { code: "missing-question", index: 1 },
      { code: "missing-question", index: 2 },
      { code: "missing-question", index: 3 },
    ]);

    spread = unwrap(setPositionQuestion(spread, "p1", "工作？"));
    spread = unwrap(setPositionQuestion(spread, "p2", "   "));
    spread = unwrap(setPositionQuestion(spread, "p3", "感情？"));
    expect(validateSpread(spread)).toEqual([
      { code: "missing-question", index: 2 },
    ]);

    spread = unwrap(setPositionQuestion(spread, "p2", "健康？"));
    expect(isSpreadReady(spread)).toBe(true);
  });

  it("needs at least one position but no main question", () => {
    expect(validateSpread(spreadOf(0))).toEqual([{ code: "no-positions" }]);
    expect(spreadOf(1).mainQuestion).toBe("");
    expect(isSpreadReady(spreadOf(1))).toBe(true);
  });

  it("caps questions at 300 characters counting CJK and emoji as one", () => {
    const long = "星".repeat(MAX_QUESTION_LENGTH + 20);
    const spread = unwrap(setPositionQuestion(spreadOf(1), "p1", long));
    expect(countCharacters(spread.positions[0]?.question ?? "")).toBe(
      MAX_QUESTION_LENGTH,
    );

    expect(countCharacters("🌙✨問")).toBe(3);
    const main = setMainQuestion(spreadOf(1), "🌙".repeat(400));
    expect(countCharacters(main.mainQuestion)).toBe(MAX_QUESTION_LENGTH);
  });
});

describe("moving and rotating", () => {
  it("clamps coordinates to the relative table", () => {
    const spread = unwrap(movePosition(spreadOf(1), "p1", { x: 1.4, y: -2 }));
    expect(spread.positions[0]).toMatchObject({ x: 1, y: 0 });

    const nudged = unwrap(nudgePosition(spread, "p1", { x: -0.25, y: 0.1 }));
    expect(nudged.positions[0]?.x).toBeCloseTo(0.75);
    expect(nudged.positions[0]?.y).toBeCloseTo(0.1);
  });

  it("normalises rotation into whole degrees in [0, 360)", () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(725)).toBe(5);
    expect(normalizeRotation(Number.NaN)).toBe(0);
    const spread = unwrap(rotatePosition(spreadOf(1), "p1", -15));
    expect(spread.positions[0]?.rotation).toBe(345);
  });

  it("keeps the drawn cards when a drawn position moves or rotates", () => {
    const drawn = unwrap(assignDraw(spreadOf(2), "p1", draw("a")));
    const moved = unwrap(movePosition(drawn, "p1", { x: 0.9, y: 0.2 }));
    const rotated = unwrap(rotatePosition(moved, "p1", 90));

    expect(rotated.positions[0]?.drawResult).toBe(
      drawn.positions[0]?.drawResult,
    );
    expect(nextPositionToDraw(rotated)?.id).toBe("p2");
  });
});

describe("drawing into positions", () => {
  it("deals in number order, regardless of where positions sit", () => {
    let spread = unwrap(reorderPosition(spreadOf(3), "p3", 1));
    expect(nextPositionToDraw(spread)?.id).toBe("p3");

    spread = unwrap(assignDraw(spread, "p3", draw("a")));
    expect(nextPositionToDraw(spread)?.id).toBe("p1");
  });

  it("keeps a primary card and its jumper on one numbered position", () => {
    const spread = unwrap(assignDraw(spreadOf(2), "p1", draw("a", "b")));
    const [first, second] = spread.positions;

    expect(first?.index).toBe(1);
    expect(first?.drawResult?.primary.cardId).toBe("a");
    expect(first?.drawResult?.jumper?.cardId).toBe("b");
    expect(second?.index).toBe(2);
    expect(spread.positions).toHaveLength(2);
  });

  it("never redraws or deletes a position that holds cards", () => {
    const spread = unwrap(assignDraw(spreadOf(2), "p1", draw("a")));
    expect(assignDraw(spread, "p1", draw("b"))).toEqual({
      ok: false,
      code: "position-drawn",
    });
    expect(removePosition(spread, "p1")).toEqual({
      ok: false,
      code: "position-drawn",
    });
  });

  it("returns nothing once every position is filled", () => {
    let spread = unwrap(assignDraw(spreadOf(1), "p1", draw("a")));
    expect(nextPositionToDraw(spread)).toBeUndefined();
    spread = unwrap(
      addPosition(spread, { id: "p2", question: "再一題", x: 0.2, y: 0.2 }),
    );
    expect(nextPositionToDraw(spread)?.id).toBe("p2");
  });
});

describe("suggestPlacement", () => {
  it("keeps the preferred point when it is free", () => {
    expect(suggestPlacement(spreadOf(0), { x: 0.5, y: 0.5 })).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });

  it("moves off an occupied point and stays on the table", () => {
    const spread = createSpread({
      id: "s",
      positions: [{ id: "a", question: "q", x: 0.5, y: 0.5 }],
    });
    const point = suggestPlacement(spread, { x: 0.5, y: 0.5 });

    expect(
      Math.abs(point.x - 0.5) >= 0.14 || Math.abs(point.y - 0.5) >= 0.36,
    ).toBe(true);
    for (const value of [point.x, point.y]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("places twelve positions without any two overlapping", () => {
    let spread = createSpread({ id: "s", positions: [] });
    for (let count = 1; count <= MAX_SPREAD_POSITIONS; count += 1) {
      spread = unwrap(
        addPosition(spread, {
          id: `p${count}`,
          question: "q",
          ...suggestPlacement(spread, { x: 0.5, y: 0.5 }),
        }),
      );
    }
    const positions = spread.positions;
    for (const a of positions) {
      for (const b of positions) {
        if (a === b) continue;
        expect(
          Math.abs(a.x - b.x) >= 0.139 || Math.abs(a.y - b.y) >= 0.359,
        ).toBe(true);
      }
    }
  });
});

describe("clearDraws", () => {
  it("returns every drawn card and keeps positions, numbers and questions", () => {
    let spread = setMainQuestion(spreadOf(3, "原本的問題"), "主問題");
    spread = unwrap(assignDraw(spread, "p1", draw("a", "b")));
    spread = unwrap(assignDraw(spread, "p3", draw("c")));

    const cleared = clearDraws(spread);
    expect(cleared.positions.every((p) => p.drawResult === undefined)).toBe(
      true,
    );
    expect(cleared.positions.map((p) => [p.id, p.index, p.question])).toEqual(
      spread.positions.map((p) => [p.id, p.index, p.question]),
    );
    expect(cleared.mainQuestion).toBe("主問題");
    expect(Object.isFrozen(cleared.positions)).toBe(true);
  });
});

describe("dealingIssues", () => {
  it("needs a main question before anything else, and keeps the spread valid without one", () => {
    const spread = spreadOf(2);
    expect(dealingIssues(spread)).toEqual([{ code: "missing-main-question" }]);
    expect(dealingIssues(setMainQuestion(spread, "   "))[0]).toEqual({
      code: "missing-main-question",
    });
    expect(validateSpread(spread)).toEqual([]);
    expect(dealingIssues(setMainQuestion(spread, "方向？"))).toEqual([]);
  });

  it("adds the spread's own issues after the main question", () => {
    expect(dealingIssues(spreadOf(1, ""))).toEqual([
      { code: "missing-main-question" },
      { code: "missing-question", index: 1 },
    ]);
  });
});
