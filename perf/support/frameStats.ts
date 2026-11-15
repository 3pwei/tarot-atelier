/**
 * Pure summaries of what a page rendered during a scenario. No browser access,
 * so the maths can be unit tested and reused by any probe that collects frame
 * intervals and long tasks.
 */

/** A frame slower than this is one a player notices as a hitch. */
export const JANK_FRAME_MS = 50;

export interface FrameSummary {
  /** Frames painted per second over the whole scenario. */
  readonly fps: number;
  /** 95th percentile time between frames. */
  readonly p95FrameMs: number;
  /** Frames that took longer than JANK_FRAME_MS. */
  readonly jankFrames: number;
  /** Main-thread time beyond 50 ms per long task: how long input was blocked. */
  readonly blockingMs: number;
}

export function summarizeFrames(
  frameIntervalsMs: readonly number[],
  longTaskDurationsMs: readonly number[],
): FrameSummary {
  const total = frameIntervalsMs.reduce((sum, interval) => sum + interval, 0);
  return {
    fps: total > 0 ? round((frameIntervalsMs.length * 1000) / total) : 0,
    p95FrameMs: round(percentile(frameIntervalsMs, 0.95)),
    jankFrames: frameIntervalsMs.filter((interval) => interval > JANK_FRAME_MS)
      .length,
    blockingMs: round(
      longTaskDurationsMs.reduce(
        (sum, duration) => sum + Math.max(0, duration - 50),
        0,
      ),
    ),
  };
}

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(fraction * sorted.length) - 1,
  );
  return sorted[Math.max(0, index)] ?? 0;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
