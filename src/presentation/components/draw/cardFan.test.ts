import { describe, expect, it } from "vitest";
import {
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
