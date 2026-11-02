import { describe, expect, it } from "vitest";
import { toLocalOffset } from "@/presentation/components/draw/drawTimelines";

describe("toLocalOffset", () => {
  it("is the identity on an unrotated, unzoomed table", () => {
    expect(toLocalOffset(30, -12, { rotation: 0, scale: 1 })).toEqual({
      x: 30,
      y: -12,
    });
  });

  it("divides by the table zoom", () => {
    const local = toLocalOffset(100, 50, { rotation: 0, scale: 2 });
    expect(local.x).toBeCloseTo(50);
    expect(local.y).toBeCloseTo(25);
  });

  it("undoes the slot rotation so the card lands on screen as planned", () => {
    // A slot turned 90° clockwise: screen right is the slot's local up.
    const local = toLocalOffset(10, 0, { rotation: 90, scale: 1 });
    expect(local.x).toBeCloseTo(0);
    expect(local.y).toBeCloseTo(-10);

    // Re-applying the frame gives back the screen offset.
    const theta = (35 * Math.PI) / 180;
    const back = toLocalOffset(42, -17, { rotation: 35, scale: 1.5 });
    const screenX = 1.5 * (back.x * Math.cos(theta) - back.y * Math.sin(theta));
    const screenY = 1.5 * (back.x * Math.sin(theta) + back.y * Math.cos(theta));
    expect(screenX).toBeCloseTo(42);
    expect(screenY).toBeCloseTo(-17);
  });
});
