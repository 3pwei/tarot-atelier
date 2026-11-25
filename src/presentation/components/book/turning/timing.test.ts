import { describe, expect, it } from "vitest";
import {
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
  const closed = { left: 56, top: 206, width: 262, height: 400 };
  /** Where a point of the final layout starts, under the camera's start. */
  const start = (
    camera: ReturnType<typeof openingCamera>,
    x: number,
    y: number,
  ) => ({
    x: camera.fromX + camera.fromScaleX * x,
    y: camera.fromY + camera.fromScaleY * y,
  });

  it("ends with the book's right-hand page on the live right-hand page, pages facing", () => {
    const page = { left: 640, top: 20, width: 602, height: 760 };
    const camera = openingCamera({ width: 1280, height: 800 }, closed, page);
    expect(camera.facingPages).toBe(true);
    expect(camera.book).toEqual(page);
  });

  it("ends on a phone with the left-hand page, the frontispiece, on the one page shown", () => {
    const page = { left: 0, top: 12, width: 390, height: 820 };
    const camera = openingCamera({ width: 390, height: 844 }, closed, page);
    expect(camera.facingPages).toBe(false);
    expect(camera.book).toEqual({ ...page, left: 390 });
  });

  it("starts exactly on the closed book, whatever their shapes", () => {
    const page = { left: 640, top: 20, width: 602, height: 760 };
    const camera = openingCamera({ width: 1280, height: 800 }, closed, page);
    const { book } = camera;
    expect(start(camera, book.left, book.top)).toEqual({
      x: closed.left,
      y: closed.top,
    });
    const corner = start(
      camera,
      book.left + book.width,
      book.top + book.height,
    );
    expect(corner.x).toBeCloseTo(closed.left + closed.width);
    expect(corner.y).toBeCloseTo(closed.top + closed.height);
  });

  it("leans the desk in far less than the book", () => {
    const page = { left: 0, top: 12, width: 390, height: 820 };
    const camera = openingCamera({ width: 390, height: 844 }, closed, page);
    expect(camera.zoom).toBeGreaterThan(1);
    expect(camera.deskScale).toBeGreaterThan(1);
    expect(camera.deskScale).toBeLessThan(camera.zoom);
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
