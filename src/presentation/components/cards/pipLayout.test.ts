import { describe, expect, it } from "vitest";
import type { TarotRank } from "@/domain/deck/types";
import { pipLayoutFor, rankLabel, toRoman } from "./pipLayout";

const numbered: readonly [TarotRank, number][] = [
  ["ace", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
];

describe("pip layout", () => {
  it.each(numbered)("places one emblem per pip for %s", (rank, count) => {
    const layout = pipLayoutFor(rank);
    expect(layout?.positions).toHaveLength(count);
    const unique = new Set(layout?.positions.map(({ x, y }) => `${x}:${y}`));
    expect(unique.size).toBe(count);
  });

  it("keeps every pip inside the art window", () => {
    for (const [rank] of numbered) {
      for (const { x, y } of pipLayoutFor(rank)?.positions ?? []) {
        expect(x).toBeGreaterThanOrEqual(40);
        expect(x).toBeLessThanOrEqual(160);
        expect(y).toBeGreaterThanOrEqual(70);
        expect(y).toBeLessThanOrEqual(210);
      }
    }
  });

  it("leaves court cards to their own emblem", () => {
    for (const rank of ["page", "knight", "queen", "king"] as const) {
      expect(pipLayoutFor(rank)).toBeUndefined();
    }
  });

  it("formats numerals for the major arcana and ranks", () => {
    expect(toRoman(0)).toBe("0");
    expect(toRoman(4)).toBe("IV");
    expect(toRoman(9)).toBe("IX");
    expect(toRoman(14)).toBe("XIV");
    expect(toRoman(19)).toBe("XIX");
    expect(toRoman(21)).toBe("XXI");
    expect(rankLabel("ace")).toBe("ACE");
    expect(rankLabel("knight")).toBe("KNIGHT");
  });
});
