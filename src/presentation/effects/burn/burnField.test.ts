import { describe, expect, it } from "vitest";
import {
  buildBurnField,
  burnRadius,
  renderBurnFrame,
  seedFromText,
  type BurnBands,
} from "./burnField";

const WIDTH = 40;
const HEIGHT = 60;
const BANDS: BurnBands = { scorch: 6, ember: 2, char: 3 };

function solidCard(): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 40;
    pixels[index + 1] = 30;
    pixels[index + 2] = 90;
    pixels[index + 3] = 255;
  }
  return pixels;
}

function frameAt(progress: number, ignition = { x: 0.5, y: 0.9 }) {
  const field = buildBurnField(WIDTH, HEIGHT, ignition, 42);
  const output = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  const glow = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  const rim = new Int32Array(512);
  const rimCount = renderBurnFrame(
    field,
    solidCard(),
    output,
    glow,
    rim,
    burnRadius(progress, field, BANDS),
    BANDS,
    0.5,
  );
  return { field, output, rimCount };
}

function alphaAt(output: Uint8ClampedArray, x: number, y: number): number {
  return output[(y * WIDTH + x) * 4 + 3] ?? -1;
}

describe("burn field", () => {
  it("is deterministic for the same seed and ignition point", () => {
    const first = buildBurnField(WIDTH, HEIGHT, { x: 0.2, y: 0.8 }, 7);
    const second = buildBurnField(WIDTH, HEIGHT, { x: 0.2, y: 0.8 }, 7);
    expect(Array.from(first.distances)).toEqual(Array.from(second.distances));
    expect(seedFromText("card:primary")).toBe(seedFromText("card:primary"));
  });

  it("starts at the ignition point", () => {
    const field = buildBurnField(WIDTH, HEIGHT, { x: 0.25, y: 0.75 }, 3);
    const nearest = field.distances.indexOf(Math.min(...field.distances));
    const x = nearest % WIDTH;
    const y = Math.floor(nearest / WIDTH);
    expect(Math.abs(x - WIDTH * 0.25)).toBeLessThanOrEqual(3);
    expect(Math.abs(y - HEIGHT * 0.75)).toBeLessThanOrEqual(3);
  });

  it("leaves the card intact before ignition and fully consumed at the end", () => {
    const start = frameAt(0);
    const end = frameAt(1);
    expect(alphaAt(start.output, 2, 2)).toBe(255);
    expect(alphaAt(start.output, WIDTH / 2, HEIGHT / 2)).toBe(255);
    expect(
      end.output.every((value, index) => index % 4 !== 3 || value === 0),
    ).toBe(true);
    expect(end.rimCount).toBe(0);
  });

  it("burns near the ignition point before the far edge", () => {
    const middle = frameAt(0.35);
    expect(alphaAt(middle.output, WIDTH / 2, HEIGHT - 4)).toBe(0);
    expect(alphaAt(middle.output, WIDTH / 2, 1)).toBe(255);
    expect(middle.rimCount).toBeGreaterThan(0);
  });

  it("advances the flame front monotonically", () => {
    const field = buildBurnField(WIDTH, HEIGHT, { x: 0.5, y: 0.5 }, 11);
    let previous = -Infinity;
    for (let step = 0; step <= 20; step += 1) {
      const radius = burnRadius(step / 20, field, BANDS);
      expect(radius).toBeGreaterThanOrEqual(previous);
      previous = radius;
    }
  });
});
