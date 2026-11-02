import { describe, expect, it } from "vitest";
import {
  clampView,
  MAX_ZOOM,
  MIN_ZOOM,
  zoomAround,
} from "@/presentation/components/spread/useBoardViewport";

const WIDTH = 600;
const HEIGHT = 400;

describe("board viewport maths", () => {
  it("keeps zoom within limits and never shows an empty gutter", () => {
    expect(clampView({ scale: 9, x: 0, y: 0 }, WIDTH, HEIGHT).scale).toBe(
      MAX_ZOOM,
    );
    expect(clampView({ scale: 0.2, x: 0, y: 0 }, WIDTH, HEIGHT)).toEqual({
      scale: MIN_ZOOM,
      x: 0,
      y: 0,
    });
    expect(clampView({ scale: 2, x: 50, y: -900 }, WIDTH, HEIGHT)).toEqual({
      scale: 2,
      x: 0,
      y: -HEIGHT,
    });
  });

  it("zooms around a point so that point stays under the cursor", () => {
    const origin = { x: 150, y: 100 };
    const view = zoomAround({ scale: 1, x: 0, y: 0 }, 2, origin, WIDTH, HEIGHT);
    // The table point under the cursor before and after is the same.
    expect((origin.x - view.x) / view.scale).toBeCloseTo(origin.x);
    expect((origin.y - view.y) / view.scale).toBeCloseTo(origin.y);
  });
});
