import { describe, expect, it } from "vitest";
import {
  pointerAngle,
  rotationFromDrag,
  snapRotation,
} from "@/presentation/components/spread/rotationGesture";

const CENTER = { x: 100, y: 100 };

describe("rotation gesture maths", () => {
  it("measures screen angles clockwise from three o'clock", () => {
    expect(pointerAngle(CENTER, { x: 150, y: 100 })).toBeCloseTo(0);
    expect(pointerAngle(CENTER, { x: 100, y: 150 })).toBeCloseTo(90);
    expect(pointerAngle(CENTER, { x: 50, y: 100 })).toBeCloseTo(180);
    expect(pointerAngle(CENTER, { x: 100, y: 50 })).toBeCloseTo(-90);
  });

  it("turns by the angle the pointer sweeps around the centre", () => {
    const start = pointerAngle(CENTER, { x: 150, y: 100 });
    const quarter = pointerAngle(CENTER, { x: 100, y: 150 });
    expect(rotationFromDrag(10, start, quarter)).toBe(100);
    // Sweeping back past the start turns the other way.
    const back = pointerAngle(CENTER, { x: 150, y: 80 });
    expect(rotationFromDrag(30, start, back)).toBe(8);
  });

  it("snaps onto 45° lines only when close", () => {
    expect(snapRotation(87)).toBe(90);
    expect(snapRotation(93.4)).toBe(90);
    expect(snapRotation(84)).toBe(84);
    expect(snapRotation(-2)).toBe(0);
    expect(snapRotation(22.4)).toBe(22);
  });
});
