import { describe, expect, it } from "vitest";
import { movePosition, reorderPosition } from "@/domain/spread/spread";
import { buildReadingRequest } from "@/domain/reading/buildReadingRequest";
import { READING_SCHEMA_VERSION } from "@/domain/reading/types";
import {
  MAJOR,
  registryOf,
  spreadOf,
  standardRegistry,
} from "@/domain/reading/testing/readingFixtures";
import { MAX_SPREAD_POSITIONS } from "@/domain/spread/types";
import { atelierStandardDeck } from "@/domain/deck/builtinDecks";

function buildOk(...args: Parameters<typeof buildReadingRequest>) {
  const build = buildReadingRequest(...args);
  if (!build.ok) throw new Error(JSON.stringify(build.issues));
  return build.request;
}

describe("buildReadingRequest", () => {
  it("builds the request from the domain model, versioned", () => {
    const spread = spreadOf(
      [
        { question: "現況是什麼？", draw: { card: MAJOR(17) } },
        {
          question: "下一步？",
          draw: { card: MAJOR(16), orientation: "reversed" },
        },
      ],
      "  我的工作方向  ",
    );
    const request = buildOk(spread, standardRegistry);

    expect(request).toEqual({
      schemaVersion: READING_SCHEMA_VERSION,
      deckId: "atelier-standard-tarot",
      mainQuestion: "我的工作方向",
      positions: [
        {
          index: 1,
          question: "現況是什麼？",
          x: spread.positions[0]?.x,
          y: 0.5,
          primary: { id: MAJOR(17), orientation: "upright" },
        },
        {
          index: 2,
          question: "下一步？",
          x: spread.positions[1]?.x,
          y: 0.5,
          primary: { id: MAJOR(16), orientation: "reversed" },
        },
      ],
    });
  });

  it("orders positions by index, not by where they sit on the table", () => {
    const base = spreadOf([
      { question: "一", draw: { card: MAJOR(1) } },
      { question: "二", draw: { card: MAJOR(2) } },
      { question: "三", draw: { card: MAJOR(3) } },
    ]);
    const moved = movePosition(base, "p1", { x: 0.95, y: 0.9 });
    if (!moved.ok) throw new Error(moved.code);
    const reordered = reorderPosition(moved.spread, "p3", 1);
    if (!reordered.ok) throw new Error(reordered.code);

    const request = buildOk(reordered.spread, standardRegistry);
    expect(request.positions.map((p) => [p.index, p.question])).toEqual([
      [1, "三"],
      [2, "一"],
      [3, "二"],
    ]);
  });

  it("keeps a jumper inside its position instead of adding one", () => {
    const spread = spreadOf([
      {
        question: "核心？",
        draw: {
          card: MAJOR(0),
          jumper: { card: MAJOR(21), orientation: "reversed" },
        },
      },
    ]);
    const request = buildOk(spread, standardRegistry);

    expect(request.positions).toHaveLength(1);
    expect(request.positions[0]?.jumper).toEqual({
      id: MAJOR(21),
      orientation: "reversed",
    });
  });

  it("omits an empty main question", () => {
    const spread = spreadOf(
      [{ question: "Q", draw: { card: MAJOR(1) } }],
      "   ",
    );
    expect(buildOk(spread, standardRegistry)).not.toHaveProperty(
      "mainQuestion",
    );
  });

  it("handles a single position and the twelve-position maximum", () => {
    const one = spreadOf([{ question: "Q", draw: { card: MAJOR(1) } }]);
    expect(buildOk(one, standardRegistry).positions).toHaveLength(1);

    const twelve = spreadOf(
      Array.from({ length: MAX_SPREAD_POSITIONS }, (_, i) => ({
        question: `問題 ${i + 1}`,
        draw: { card: MAJOR(i) },
      })),
    );
    const request = buildOk(twelve, standardRegistry);
    expect(request.positions.map((p) => p.index)).toEqual(
      Array.from({ length: MAX_SPREAD_POSITIONS }, (_, i) => i + 1),
    );
  });

  it("refuses a position without a question", () => {
    const spread = spreadOf([
      { question: "有問題", draw: { card: MAJOR(1) } },
      { question: "  ", draw: { card: MAJOR(2) } },
    ]);
    expect(buildReadingRequest(spread, standardRegistry)).toEqual({
      ok: false,
      issues: [{ code: "missing-question", index: 2 }],
    });
  });

  it("refuses positions that have not been drawn", () => {
    const spread = spreadOf([
      { question: "一", draw: { card: MAJOR(1) } },
      { question: "二" },
    ]);
    expect(buildReadingRequest(spread, standardRegistry)).toEqual({
      ok: false,
      issues: [{ code: "undrawn-position", index: 2 }],
    });
  });

  it("refuses card IDs the deck does not contain", () => {
    const spread = spreadOf([
      { question: "一", draw: { card: "atelier-standard.major.99" } },
      {
        question: "二",
        draw: { card: MAJOR(2), jumper: { card: "not-a-card" } },
      },
    ]);
    expect(buildReadingRequest(spread, standardRegistry)).toEqual({
      ok: false,
      issues: [
        {
          code: "unknown-card",
          index: 1,
          cardId: "atelier-standard.major.99",
        },
        { code: "unknown-card", index: 2, cardId: "not-a-card" },
      ],
    });
  });

  it("refuses a deck the registry does not know", () => {
    const spread = spreadOf([{ question: "一", draw: { card: MAJOR(1) } }]);
    expect(buildReadingRequest(spread, registryOf())).toEqual({
      ok: false,
      issues: [{ code: "unknown-deck", deckId: atelierStandardDeck.id }],
    });
  });

  it("refuses a spread that mixes decks", () => {
    const spread = spreadOf([
      { question: "一", draw: { card: MAJOR(1) } },
      {
        question: "二",
        draw: { card: "phase-one-test.tide", deckId: "phase-one-test-deck" },
      },
    ]);
    expect(buildReadingRequest(spread, standardRegistry)).toEqual({
      ok: false,
      issues: [{ code: "mixed-decks" }],
    });
  });

  it("refuses an empty spread", () => {
    expect(buildReadingRequest(spreadOf([]), standardRegistry)).toEqual({
      ok: false,
      issues: [{ code: "no-positions" }],
    });
  });
});
