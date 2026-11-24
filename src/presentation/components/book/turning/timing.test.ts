import { describe, expect, it } from "vitest";
import {
  finalBookRect,
  hasFacingPages,
  leafVisibility,
  openingCamera,
  openingMs,
} from "@/presentation/components/book/turning/opening";
import {
  reversedTimeline,
  riffleTimeline,
} from "@/presentation/components/book/turning/timing";

describe("riffleTimeline", () => {
  const timeline = riffleTimeline(7);

  it("turns the real leaf first, then each sheet a little later", () => {
    expect(timeline.leaf.delayMs).toBe(0);
    const delays = timeline.sheets.map((sheet) => sheet.delayMs);
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(new Set(delays).size).toBe(7);
  });

  it("ends when the last sheet lands, within a second", () => {
    const last = timeline.sheets.at(-1)!;
    expect(timeline.totalMs).toBe(last.delayMs + last.durationMs);
    expect(timeline.totalMs).toBeLessThanOrEqual(1000);
  });

  it("played back, the last sheet lifts first and the leaf lands last", () => {
    const back = reversedTimeline(timeline);
    expect(back.sheets.at(-1)!.delayMs).toBe(0);
    expect(back.leaf.delayMs + back.leaf.durationMs).toBe(back.totalMs);
  });
});

describe("openingCamera", () => {
  /** A closed book centred on the screen, the cover's width by its art. */
  function centred(width: number, height: number, bookWidth: number) {
    const bookHeight = (bookWidth * 520) / 340;
    return openingCamera(
      { width, height },
      {
        left: (width - bookWidth) / 2,
        top: (height - bookHeight) / 2,
        width: bookWidth,
        height: bookHeight,
      },
    );
  }

  it("leans in on a phone until one page fills the screen", () => {
    const camera = centred(375, 812, 262);
    expect(camera.facingPages).toBe(false);
    expect(camera.bookWidth * camera.scale).toBeGreaterThanOrEqual(375);
    expect(camera.bookHeight * camera.scale).toBeGreaterThanOrEqual(812);
    // The left page's middle, half a book left of the spine, comes to the centre.
    expect(camera.shiftX).toBeCloseTo(camera.bookWidth * camera.scale);
    expect(camera.shiftY).toBeCloseTo(0);
    // The desk follows only a little of the lean.
    expect(camera.deskScale).toBeGreaterThan(1);
    expect(camera.deskScale).toBeLessThan(camera.scale);
  });

  it("keeps both pages on the desk on a wide screen", () => {
    const camera = centred(1280, 800, 314);
    expect(camera.facingPages).toBe(true);
    expect(2 * camera.bookWidth * camera.scale).toBeLessThan(1280);
    expect(camera.bookHeight * camera.scale).toBeLessThan(800);
    expect(camera.shiftX).toBeCloseTo((camera.bookWidth / 2) * camera.scale);
  });

  it("starts from wherever the cover lay, not only the middle", () => {
    const camera = openingCamera(
      { width: 375, height: 812 },
      { left: 50, top: 100, width: 262, height: 400 },
    );
    expect(camera.bookTop).toBe(100);
    // The book sat above the middle: the camera brings it down to centre.
    expect(camera.shiftY).toBeGreaterThan(0);
  });
});

describe("finalBookRect", () => {
  it("is where the camera leaves the book: on a phone, the left page fills the screen", () => {
    const viewport = { width: 375, height: 812 };
    const camera = openingCamera(viewport, {
      left: 56,
      top: 206,
      width: 262,
      height: 400,
    });
    const rect = finalBookRect(camera, viewport);
    // The closed book's left edge is the spine: the left page opens out from
    // it, one book's width to the left, and spans the screen.
    expect(rect.left - rect.width).toBeLessThanOrEqual(0);
    expect(rect.left).toBeGreaterThanOrEqual(375);
    expect(rect.top).toBeLessThanOrEqual(0);
    expect(rect.top + rect.height).toBeGreaterThanOrEqual(812);
  });
});

describe("hasFacingPages", () => {
  it("needs a wide, landscape screen", () => {
    expect(hasFacingPages({ width: 1280, height: 800 })).toBe(true);
    expect(hasFacingPages({ width: 820, height: 600 })).toBe(false);
    expect(hasFacingPages({ width: 1000, height: 1200 })).toBe(false);
  });
});

describe("openingMs", () => {
  it("lasts about two seconds", () => {
    expect(openingMs()).toBeGreaterThan(1500);
    expect(openingMs()).toBeLessThan(2500);
  });
});

describe("leafVisibility", () => {
  const leaves = [
    { delayMs: 500, durationMs: 600 },
    { delayMs: 900, durationMs: 400 },
    { delayMs: 1000, durationMs: 500 },
  ];
  const shown = leafVisibility(leaves);

  it("shows the top leaf from the start, the others once the one above lifts", () => {
    expect(shown.map((leaf) => leaf.showAtMs)).toEqual([0, 500, 900]);
  });

  it("hides a landed leaf once the next lands on it; the last stays", () => {
    expect(shown.map((leaf) => leaf.hideAtMs)).toEqual([1300, 1500, undefined]);
  });
});
