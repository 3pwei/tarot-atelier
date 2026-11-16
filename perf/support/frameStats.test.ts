import { describe, expect, it } from "vitest";
import { JANK_FRAME_MS, summarizeFrames } from "./frameStats";

describe("summarizeFrames", () => {
  it("reports frames per second from the intervals between frames", () => {
    const sixtyHertz = Array.from({ length: 60 }, () => 1000 / 60);

    expect(summarizeFrames(sixtyHertz, []).fps).toBe(60);
  });

  it("counts only frames slower than the jank limit", () => {
    const summary = summarizeFrames(
      [16, JANK_FRAME_MS, JANK_FRAME_MS + 1, 120],
      [],
    );

    expect(summary.jankFrames).toBe(2);
    expect(summary.p95FrameMs).toBe(120);
  });

  it("counts blocking time as the part of each long task past 50 ms", () => {
    expect(summarizeFrames([16], [60, 250]).blockingMs).toBe(210);
  });

  it("reports zeros when nothing was rendered", () => {
    expect(summarizeFrames([], [])).toEqual({
      fps: 0,
      p95FrameMs: 0,
      jankFrames: 0,
      blockingMs: 0,
    });
  });
});
