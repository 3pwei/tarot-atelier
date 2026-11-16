import { describe, expect, it } from "vitest";
import {
  PILE_CENTER,
  seededRandom,
  washPaths,
} from "@/presentation/components/draw/tableWash";

describe("washPaths", () => {
  it("is the same for the same seed", () => {
    expect(washPaths(4, seededRandom(7))).toEqual(
      washPaths(4, seededRandom(7)),
    );
    expect(washPaths(4, seededRandom(7))).not.toEqual(
      washPaths(4, seededRandom(8)),
    );
  });

  it("keeps every stop on the cloth", () => {
    for (const card of washPaths(50, seededRandom(3))) {
      for (const stop of card.stops) {
        expect(stop.x).toBeGreaterThanOrEqual(10);
        expect(stop.x).toBeLessThanOrEqual(90);
        expect(stop.y).toBeGreaterThanOrEqual(12);
        expect(stop.y).toBeLessThanOrEqual(82);
      }
    }
  });

  it("gathers every card into a tidy pile where the pack lies", () => {
    for (const card of washPaths(20, seededRandom(5))) {
      expect(Math.abs(card.rest.x - PILE_CENTER.x)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(card.rest.y - PILE_CENTER.y)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(card.rest.rotation)).toBeLessThanOrEqual(8);
    }
  });
});

describe("seededRandom", () => {
  it("stays within [0, 1)", () => {
    const random = seededRandom(0);
    for (let draw = 0; draw < 1_000; draw += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
