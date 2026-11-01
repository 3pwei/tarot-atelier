import { describe, expect, it } from "vitest";
import {
  createCardInstance,
  DrawExperience,
  InvalidDrawTransitionError,
  isJumperTriggered,
  type RandomSource,
} from "@/domain/deck/draw";

function sequenceRandom(...values: readonly number[]): RandomSource {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}

function readyExperience(options: {
  readonly cardIds: readonly string[];
  readonly random?: RandomSource;
  readonly supportsReversals?: boolean;
}) {
  const experience = new DrawExperience({
    deckId: "test-deck",
    cardIds: options.cardIds,
    supportsReversals: options.supportsReversals ?? true,
    random: options.random,
    now: () => new Date("2026-11-01T00:00:00.000Z"),
  });
  experience.beginShuffle();
  experience.completeShuffle();
  return experience;
}

describe("DrawExperience", () => {
  it("follows the guarded idle to revealed state sequence", () => {
    const experience = new DrawExperience({
      deckId: "test-deck",
      cardIds: ["card-a"],
      supportsReversals: true,
      random: () => 0.9,
    });

    expect(experience.state).toBe("idle");
    experience.beginShuffle();
    expect(experience.state).toBe("shuffling");
    experience.completeShuffle();
    expect(experience.state).toBe("ready");
    experience.draw();
    expect(experience.state).toBe("drawing");
    experience.reveal();
    expect(experience.state).toBe("revealed");
  });

  it("handles an empty pile without leaving ready state", () => {
    const experience = readyExperience({ cardIds: [] });

    expect(experience.draw()).toBeUndefined();
    expect(experience.state).toBe("ready");
    expect(experience.remainingCount).toBe(0);
  });

  it("always draws one card when only one remains", () => {
    const experience = readyExperience({
      cardIds: ["only-card"],
      random: () => 0,
    });

    const result = experience.draw();

    expect(result?.primary.cardId).toBe("only-card");
    expect(result?.jumper).toBeUndefined();
    expect(result?.drawnAt).toBe("2026-11-01T00:00:00.000Z");
    expect(experience.remainingCount).toBe(0);
  });

  it("removes both distinct IDs when the rare jumper threshold is hit", () => {
    const experience = readyExperience({
      cardIds: ["card-a", "card-b"],
      // shuffle, 3% gate, primary orientation, jumper orientation
      random: sequenceRandom(0.99, 0.029, 0.8, 0.2),
    });

    const result = experience.draw();

    expect(result?.jumper).toBeDefined();
    expect(result?.primary.cardId).not.toBe(result?.jumper?.cardId);
    expect(result?.primary.orientation).toBe("upright");
    expect(result?.jumper?.orientation).toBe("reversed");
    expect(experience.remainingCount).toBe(0);
  });

  it("does not trigger rare mode at the exclusive 3% boundary", () => {
    const experience = readyExperience({
      cardIds: ["card-a", "card-b"],
      random: sequenceRandom(0.99, 0.03, 0.8),
    });

    expect(experience.draw()?.jumper).toBeUndefined();
    expect(experience.remainingCount).toBe(1);
  });

  it("draws at most one jumper even when more cards remain", () => {
    const experience = readyExperience({
      cardIds: ["card-a", "card-b", "card-c"],
      random: sequenceRandom(0, 0, 0, 0, 0),
    });

    const result = experience.draw();

    expect(Object.keys(result ?? {})).toEqual(["primary", "jumper", "drawnAt"]);
    expect(experience.remainingCount).toBe(1);
  });

  it("keeps every card upright when reversals are disabled", () => {
    const experience = readyExperience({
      cardIds: ["card-a", "card-b"],
      random: sequenceRandom(0.99, 0, 0, 0),
      supportsReversals: false,
    });

    const result = experience.draw();

    expect(result?.primary.orientation).toBe("upright");
    expect(result?.jumper?.orientation).toBe("upright");
  });

  it("rejects another draw while the reveal animation is in progress", () => {
    const experience = readyExperience({
      cardIds: ["card-a", "card-b"],
      random: sequenceRandom(0.99, 0.9, 0.9),
    });

    experience.draw();

    expect(() => experience.draw()).toThrow(InvalidDrawTransitionError);
    experience.reveal();
    expect(experience.state).toBe("revealed");
  });

  it("never returns the same stable ID twice across operations", () => {
    const experience = readyExperience({
      cardIds: ["card-a", "card-b", "card-c"],
      random: () => 0.9,
    });
    const first = experience.draw();
    experience.reveal();
    experience.beginShuffle();
    experience.completeShuffle();
    const second = experience.draw();

    expect(first?.primary.cardId).not.toBe(second?.primary.cardId);
  });
});

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
