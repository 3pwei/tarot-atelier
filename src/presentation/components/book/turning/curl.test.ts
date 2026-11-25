import { describe, expect, it } from "vitest";
import {
  curlFrames,
  curlKeyframesCss,
  curlReach,
  CURL_LAYERS,
  easeInOutCubic,
} from "@/presentation/components/book/turning/curl";

const page = { width: 360, height: 760 };

function angleOf(transform: string): number {
  const match = /rotate\((-?[\d.]+)deg\)/u.exec(transform);
  if (!match) throw new Error(`no rotation in ${transform}`);
  return Number(match[1]);
}

describe("curlFrames", () => {
  const frames = curlFrames(page);

  it("samples the turn evenly in time, from flat to flat", () => {
    expect(frames).toHaveLength(25);
    expect(frames[0]!.offset).toBe(0);
    expect(frames.at(-1)!.offset).toBe(1);
  });

  it("starts and ends with no light or shade along the fold", () => {
    for (const frame of [frames[0]!, frames.at(-1)!]) {
      expect(frame.layers.flapShade.opacity).toBeLessThan(0.05);
      expect(frame.layers.underShade.opacity).toBeLessThan(0.05);
    }
  });

  it("shades the fold most while the leaf stands up", () => {
    const middle = frames[12]!;
    expect(middle.layers.flapShade.opacity).toBeGreaterThan(0.9);
  });

  it("turns the fold smoothly, never spinning between neighbouring frames", () => {
    const angles = frames.map((frame) =>
      angleOf(frame.layers.keepFold.transform),
    );
    for (let index = 1; index < angles.length; index += 1) {
      expect(Math.abs(angles[index]! - angles[index - 1]!)).toBeLessThan(45);
    }
  });

  it("only ever moves and fades: transforms and opacity, nothing else", () => {
    const css = curlKeyframesCss(page.width, page.height, frames);
    const properties = new Set(
      [...css.matchAll(/[{;]([a-z-]+):/gu)].map((match) => match[1]),
    );
    expect([...properties].sort()).toEqual(["opacity", "transform"]);
    for (const layer of CURL_LAYERS) {
      expect(css).toContain(`@keyframes curl-${layer}-360x760{`);
    }
  });
});

describe("curlReach", () => {
  it("covers the page's diagonal from any fold", () => {
    expect(curlReach(300, 400)).toBeGreaterThanOrEqual(500);
  });
});

describe("easeInOutCubic", () => {
  it("is gentle at both ends and halfway at the middle", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.1)).toBeLessThan(0.01);
  });
});
