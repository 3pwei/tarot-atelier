import { describe, expect, it } from "vitest";
import {
  fanPlacements,
  fanSpan,
  jumperSlot,
  openFan,
  openSlots,
  pileIndexOf,
  takeSlots,
} from "@/presentation/components/draw/cardFan";

describe("the fanned pile", () => {
  it("maps a slot to the card's place among the cards still there", () => {
    const fan = takeSlots(openFan(6), [1, 2]);

    expect(pileIndexOf(fan, 0)).toBe(0);
    expect(pileIndexOf(fan, 3)).toBe(1);
    expect(pileIndexOf(fan, 5)).toBe(3);
    expect(openSlots(fan)).toEqual([0, 3, 4, 5]);
  });

  it("takes the next open card as the jumper, skipping gaps", () => {
    const fan = takeSlots(openFan(6), [3]);

    expect(jumperSlot(fan, 2)).toBe(4);
  });

  it("takes the previous open card when the last one is chosen", () => {
    const fan = takeSlots(openFan(5), [3]);

    expect(jumperSlot(fan, 4)).toBe(2);
  });

  it("has no jumper when only one card is left", () => {
    expect(jumperSlot(takeSlots(openFan(3), [0, 1]), 2)).toBeUndefined();
  });

  it("keeps the original fan unchanged when slots are taken", () => {
    const fan = openFan(3);
    takeSlots(fan, [0]);

    expect(fan.taken.size).toBe(0);
  });
});

describe("fan placements", () => {
  it("spreads the cards evenly along a symmetric arc", () => {
    const placements = fanPlacements(5, { spacing: 10, sweep: 20, sag: 8 });

    expect(placements.map((p) => p.x)).toEqual([0, 10, 20, 30, 40]);
    expect(placements[0]?.rotation).toBe(-10);
    expect(placements[2]?.rotation).toBe(0);
    expect(placements[4]?.rotation).toBe(10);
    expect(placements[0]?.y).toBe(8);
    expect(placements[2]?.y).toBe(0);
  });

  it("puts a single card upright in the middle", () => {
    expect(fanPlacements(1)).toEqual([{ x: 0, y: 0, rotation: 0 }]);
  });

  it("is as wide as the gaps between the cards", () => {
    expect(fanSpan(78, { spacing: 14, sweep: 0, sag: 0 })).toBe(77 * 14);
    expect(fanSpan(0)).toBe(0);
  });
});
