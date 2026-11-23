import { describe, expect, it } from "vitest";
import {
  createCardInstance,
  isJumperTriggered,
  jumperNeighbourIndex,
} from "@/domain/deck/draw";

describe("jumper statistics", () => {
  it("uses the public off, rare, normal, and chaos thresholds", () => {
    expect(isJumperTriggered("off", 2, () => 0)).toBe(false);
    expect(isJumperTriggered("rare", 2, () => 0.029)).toBe(true);
    expect(isJumperTriggered("rare", 2, () => 0.03)).toBe(false);
    expect(isJumperTriggered("normal", 2, () => 0.079)).toBe(true);
    expect(isJumperTriggered("normal", 2, () => 0.08)).toBe(false);
    expect(isJumperTriggered("chaos", 2, () => 0.149)).toBe(true);
    expect(isJumperTriggered("chaos", 2, () => 0.15)).toBe(false);
  });

  it("uses a 50% reversal boundary only for supported decks", () => {
    const options = {
      instanceId: "instance",
      deckId: "deck",
      cardId: "card",
      supportsReversals: true,
    } as const;

    expect(
      createCardInstance({ ...options, random: () => 0.499 }).orientation,
    ).toBe("reversed");
    expect(
      createCardInstance({ ...options, random: () => 0.5 }).orientation,
    ).toBe("upright");
  });

  it("keeps a deterministic 100,000-sample rare-mode simulation near 3%", () => {
    let seed = 0x9e3779b9;
    const random = () => {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    let hits = 0;

    for (let index = 0; index < 100_000; index += 1) {
      if (isJumperTriggered("rare", 2, random)) hits += 1;
    }

    expect(hits).toBeGreaterThanOrEqual(2_800);
    expect(hits).toBeLessThanOrEqual(3_200);
  });
});

describe("jumperNeighbourIndex", () => {
  it("is the next card, or the previous one for the last card", () => {
    expect(jumperNeighbourIndex(0, 5)).toBe(1);
    expect(jumperNeighbourIndex(3, 5)).toBe(4);
    expect(jumperNeighbourIndex(4, 5)).toBe(3);
  });
});
