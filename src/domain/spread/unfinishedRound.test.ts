import { describe, expect, it } from "vitest";
import type { DrawResult } from "@/domain/deck/draw";
import {
  assignDraw,
  createSpread,
  type SpreadUpdate,
} from "@/domain/spread/spread";
import type { SpreadSession } from "@/domain/spread/spreadSnapshot";
import type { Spread } from "@/domain/spread/types";
import { returnUnfinishedRound } from "@/domain/spread/unfinishedRound";

function unwrap(update: SpreadUpdate): Spread {
  if (!update.ok) throw new Error(`Expected success, got ${update.code}`);
  return update.spread;
}

function draw(card: string, jumper?: string): DrawResult {
  const instance = (cardId: string) => ({
    instanceId: `deck:${cardId}`,
    deckId: "deck",
    cardId,
    orientation: "upright" as const,
  });
  return {
    primary: instance(card),
    ...(jumper ? { jumper: instance(jumper) } : {}),
    drawnAt: "2026-11-18T00:00:00.000Z",
  };
}

/** Three positions, with the given cards drawn into the first ones. */
function sessionWith(
  draws: readonly DrawResult[],
  revealed: readonly string[] = [],
): SpreadSession {
  let spread = createSpread({
    id: "spread",
    positions: ["p1", "p2", "p3"].map((id, order) => ({
      id,
      question: "問題",
      x: order / 3,
      y: 0.5,
    })),
  });
  draws.forEach((result, order) => {
    spread = unwrap(assignDraw(spread, `p${order + 1}`, result));
  });
  return { deckId: "deck", spread, revealedInstanceIds: revealed };
}

const drawnIds = (session: SpreadSession) =>
  session.spread.positions.map(
    (position) => position.drawResult?.primary.cardId,
  );

describe("returnUnfinishedRound", () => {
  it("returns the face-down cards of a round left half chosen", () => {
    const { session, returnedCount } = returnUnfinishedRound(
      sessionWith([draw("a")]),
    );

    expect(returnedCount).toBe(1);
    expect(drawnIds(session)).toEqual([undefined, undefined, undefined]);
  });

  it("keeps the cards of earlier rounds that were already turned over", () => {
    const { session, returnedCount } = returnUnfinishedRound(
      sessionWith([draw("a"), draw("b")], ["deck:a"]),
    );

    expect(returnedCount).toBe(1);
    expect(drawnIds(session)).toEqual(["a", undefined, undefined]);
    expect(session.revealedInstanceIds).toEqual(["deck:a"]);
  });

  it("returns a card whose jumper is still face down with it", () => {
    const { session, returnedCount } = returnUnfinishedRound(
      sessionWith([draw("a", "b")], ["deck:a"]),
    );

    expect(returnedCount).toBe(1);
    expect(drawnIds(session)).toEqual([undefined, undefined, undefined]);
    // A returned card is no longer on the table, turned over or not.
    expect(session.revealedInstanceIds).toEqual([]);
  });

  it("leaves a finished round alone, even before its cards are turned over", () => {
    const saved = sessionWith([draw("a"), draw("b"), draw("c")]);

    expect(returnUnfinishedRound(saved)).toEqual({
      session: saved,
      returnedCount: 0,
    });
  });

  it("leaves a table between rounds alone", () => {
    const saved = sessionWith([draw("a")], ["deck:a"]);

    expect(returnUnfinishedRound(saved)).toEqual({
      session: saved,
      returnedCount: 0,
    });
  });

  it("leaves an empty table alone", () => {
    const saved = sessionWith([]);

    expect(returnUnfinishedRound(saved).returnedCount).toBe(0);
  });
});
