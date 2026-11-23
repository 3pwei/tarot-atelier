import { describe, expect, it } from "vitest";
import type { RandomSource } from "@/domain/deck/draw";
import {
  beginShuffle,
  completeShuffle,
  continueDrawing,
  createDrawPile,
  describeDrawPileIssue,
  drawAt,
  reveal,
  type DrawPile,
  type DrawPileOptions,
  type DrawPileStep,
  type DrawnFromPile,
} from "@/domain/deck/drawPile";

const NOW = () => new Date("2026-11-01T00:00:00.000Z");

function sequenceRandom(...values: readonly number[]): RandomSource {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}

function must<Value>(step: DrawPileStep<Value>): Value {
  if (!step.ok) throw new Error(describeDrawPileIssue(step.issue));
  return step.value;
}

function newPile(
  options: Partial<DrawPileOptions> & { cardIds: readonly string[] },
) {
  return must(
    createDrawPile({
      deckId: "test-deck",
      supportsReversals: true,
      jumperMode: "rare",
      ...options,
    }),
  );
}

function readyPile(
  options: Partial<DrawPileOptions> & { cardIds: readonly string[] },
  random: RandomSource,
): DrawPile {
  return must(completeShuffle(must(beginShuffle(newPile(options))), random));
}

function draw(
  pile: DrawPile,
  index: number,
  random: RandomSource,
): DrawnFromPile {
  return must(drawAt(pile, index, { random, now: NOW }));
}

describe("draw pile", () => {
  it("follows the guarded idle to revealed sequence", () => {
    const random = () => 0.9;
    const idle = newPile({ cardIds: ["card-a"] });
    expect(idle.state).toBe("idle");
    const shuffling = must(beginShuffle(idle));
    expect(shuffling.state).toBe("shuffling");
    const ready = must(completeShuffle(shuffling, random));
    expect(ready.state).toBe("ready");
    const { pile: drawing } = draw(ready, 0, random);
    expect(drawing.state).toBe("drawing");
    expect(must(reveal(drawing)).state).toBe("revealed");
  });

  it("never changes the pile it was given", () => {
    const idle = newPile({ cardIds: ["a", "b"] });
    must(beginShuffle(idle));
    expect(idle.state).toBe("idle");
  });

  it("reports an empty pile instead of drawing", () => {
    const ready = readyPile({ cardIds: [] }, () => 0.9);
    expect(drawAt(ready, 0, { random: () => 0.9, now: NOW })).toEqual({
      ok: false,
      issue: { code: "empty-pile" },
    });
  });

  it("always draws one card when only one remains", () => {
    const random = () => 0;
    const { pile, result } = draw(
      readyPile({ cardIds: ["only-card"] }, random),
      0,
      random,
    );

    expect(result.primary.cardId).toBe("only-card");
    expect(result.jumper).toBeUndefined();
    expect(result.drawnAt).toBe("2026-11-01T00:00:00.000Z");
    expect(pile.remainingCardIds).toHaveLength(0);
  });

  it("removes both distinct IDs when the rare jumper threshold is hit", () => {
    // shuffle, 3% gate, primary orientation, jumper orientation
    const random = sequenceRandom(0.99, 0.029, 0.8, 0.2);
    const { pile, result } = draw(
      readyPile({ cardIds: ["card-a", "card-b"] }, random),
      0,
      random,
    );

    expect(result.jumper).toBeDefined();
    expect(result.primary.cardId).not.toBe(result.jumper?.cardId);
    expect(result.primary.orientation).toBe("upright");
    expect(result.jumper?.orientation).toBe("reversed");
    expect(pile.remainingCardIds).toHaveLength(0);
  });

  it("does not trigger rare mode at the exclusive 3% boundary", () => {
    const random = sequenceRandom(0.99, 0.03, 0.8);
    const { pile, result } = draw(
      readyPile({ cardIds: ["card-a", "card-b"] }, random),
      0,
      random,
    );

    expect(result.jumper).toBeUndefined();
    expect(pile.remainingCardIds).toHaveLength(1);
  });

  it("draws at most one jumper even when more cards remain", () => {
    const random = sequenceRandom(0, 0, 0, 0, 0);
    const { pile, result } = draw(
      readyPile({ cardIds: ["card-a", "card-b", "card-c"] }, random),
      0,
      random,
    );

    expect(Object.keys(result)).toEqual(["primary", "jumper", "drawnAt"]);
    expect(pile.remainingCardIds).toHaveLength(1);
  });

  it("keeps every card upright when reversals are disabled", () => {
    const random = sequenceRandom(0.99, 0, 0, 0);
    const { result } = draw(
      readyPile(
        { cardIds: ["card-a", "card-b"], supportsReversals: false },
        random,
      ),
      0,
      random,
    );

    expect(result.primary.orientation).toBe("upright");
    expect(result.jumper?.orientation).toBe("upright");
  });

  it("rejects another draw while the drawn card is still on its way", () => {
    const random = sequenceRandom(0.99, 0.9, 0.9);
    const { pile } = draw(
      readyPile({ cardIds: ["card-a", "card-b"] }, random),
      0,
      random,
    );

    expect(drawAt(pile, 0, { random, now: NOW })).toEqual({
      ok: false,
      issue: { code: "invalid-transition", from: "drawing", action: "draw" },
    });
    expect(must(reveal(pile)).state).toBe("revealed");
  });

  it("never returns the same card twice across rounds", () => {
    const random = () => 0.9;
    const first = draw(
      readyPile({ cardIds: ["card-a", "card-b", "card-c"] }, random),
      0,
      random,
    );
    const reshuffled = must(
      completeShuffle(must(beginShuffle(must(reveal(first.pile)))), random),
    );
    const second = draw(reshuffled, 0, random);

    expect(first.result.primary.cardId).not.toBe(second.result.primary.cardId);
  });

  it("deals the next spread card from the same pile without reshuffling", () => {
    const random = () => 0.9;
    const first = draw(
      readyPile({ cardIds: ["card-a", "card-b", "card-c"] }, random),
      0,
      random,
    );
    const next = must(continueDrawing(must(reveal(first.pile))));
    expect(next.state).toBe("ready");
    const second = draw(next, 0, random);

    expect(second.result.primary.cardId).not.toBe(first.result.primary.cardId);
    expect(second.result.primary.instanceId).toBe("test-deck:draw-2:primary");
    expect(second.pile.remainingCardIds).toHaveLength(1);
  });

  it("only continues drawing after the current card is revealed", () => {
    const random = () => 0.9;
    const ready = readyPile({ cardIds: ["a", "b"] }, random);
    expect(continueDrawing(ready).ok).toBe(false);
    expect(continueDrawing(draw(ready, 0, random).pile).ok).toBe(false);
  });

  it("restores a pile without cards that are already on the table", () => {
    const random = () => 0.9;
    const pile = newPile({
      cardIds: ["a", "b", "c", "d"],
      supportsReversals: false,
      alreadyDrawnCardIds: ["b", "d"],
      previousDrawCount: 2,
    });
    expect(pile.remainingCardIds).toEqual(["a", "c"]);

    const { result } = draw(
      must(completeShuffle(must(beginShuffle(pile)), random)),
      0,
      random,
    );

    expect(["a", "c"]).toContain(result.primary.cardId);
    expect(result.primary.instanceId).toBe("test-deck:draw-3:primary");
  });

  it("rejects duplicate cards, a negative draw count and an impossible reversal chance", () => {
    const base = {
      deckId: "d",
      supportsReversals: false,
      jumperMode: "rare",
    } as const;
    expect(createDrawPile({ ...base, cardIds: ["a", "a"] })).toEqual({
      ok: false,
      issue: { code: "duplicate-card-ids" },
    });
    expect(
      createDrawPile({ ...base, cardIds: ["a"], previousDrawCount: -1 }),
    ).toEqual({
      ok: false,
      issue: { code: "invalid-previous-draw-count", value: -1 },
    });
    expect(
      createDrawPile({ ...base, cardIds: ["a"], reversedProbability: 2 }),
    ).toEqual({
      ok: false,
      issue: { code: "invalid-reversed-probability", value: 2 },
    });
  });

  it("draws the card the person chose", () => {
    // A random source this close to 1 leaves Fisher–Yates order untouched.
    const random = () => 0.999;
    const first = draw(
      readyPile({ cardIds: ["a", "b", "c", "d", "e"] }, random),
      2,
      random,
    );

    expect(first.result.primary.cardId).toBe("c");
    expect(first.result.jumper).toBeUndefined();
    expect(first.pile.remainingCardIds).toHaveLength(4);
    const next = must(continueDrawing(must(reveal(first.pile))));
    expect(draw(next, 2, random).result.primary.cardId).toBe("d");
  });

  it("lets the neighbour after the chosen card jump out with it", () => {
    // shuffle ×3 (no swaps), jumper gate, two orientations
    const random = sequenceRandom(0.999, 0.999, 0.999, 0.01, 0.9, 0.9);
    const { pile, result } = draw(
      readyPile({ cardIds: ["a", "b", "c", "d"] }, random),
      1,
      random,
    );

    expect(result.primary.cardId).toBe("b");
    expect(result.jumper?.cardId).toBe("c");
    expect(pile.remainingCardIds).toHaveLength(2);
  });

  it("takes the previous card as the jumper when the last card is chosen", () => {
    const random = sequenceRandom(0.999, 0.999, 0.01, 0.9, 0.9);
    const { result } = draw(
      readyPile({ cardIds: ["a", "b", "c"] }, random),
      2,
      random,
    );

    expect(result.jumper?.cardId).toBe("b");
  });

  it("rejects a choice outside the pile and stays ready", () => {
    const random = () => 0.999;
    const ready = readyPile({ cardIds: ["a", "b"] }, random);

    for (const index of [2, -1, 0.5]) {
      expect(drawAt(ready, index, { random, now: NOW })).toEqual({
        ok: false,
        issue: { code: "index-out-of-range", index, remaining: 2 },
      });
    }
    expect(ready.state).toBe("ready");
  });

  it("decides the order when the shuffle completes, not when it begins", () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return 0.5;
    };
    const shuffling = must(
      beginShuffle(
        newPile({ cardIds: ["a", "b", "c"], supportsReversals: false }),
      ),
    );
    expect(calls).toBe(0);
    must(completeShuffle(shuffling, random));
    expect(calls).toBe(2);
  });

  it("explains each problem in words", () => {
    expect(
      describeDrawPileIssue({
        code: "invalid-transition",
        from: "drawing",
        action: "draw",
      }),
    ).toBe("Cannot draw while the draw pile is drawing.");
    expect(
      describeDrawPileIssue({
        code: "index-out-of-range",
        index: 5,
        remaining: 2,
      }),
    ).toBe("index must be an integer from 0 to 1, got 5.");
  });
});
