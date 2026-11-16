import { describe, expect, it, vi } from "vitest";
import {
  createFrameCoalescer,
  type FrameScheduler,
} from "@/presentation/components/spread/frameCoalescer";

function steppedFrames() {
  const callbacks = new Map<number, () => void>();
  let next = 1;
  const scheduler: FrameScheduler = {
    request: (callback) => {
      callbacks.set(next, callback);
      return next++;
    },
    cancel: (handle) => callbacks.delete(handle),
  };
  const paint = () => {
    const due = [...callbacks.values()];
    callbacks.clear();
    due.forEach((callback) => callback());
  };
  return { scheduler, paint, waiting: () => callbacks.size };
}

describe("createFrameCoalescer", () => {
  it("runs only the newest update once per frame", () => {
    const frames = steppedFrames();
    const coalescer = createFrameCoalescer(frames.scheduler);
    const applied: number[] = [];

    coalescer.schedule(() => applied.push(1));
    coalescer.schedule(() => applied.push(2));
    coalescer.schedule(() => applied.push(3));
    expect(frames.waiting()).toBe(1);
    frames.paint();

    expect(applied).toEqual([3]);
  });

  it("asks for a new frame after one has run", () => {
    const frames = steppedFrames();
    const coalescer = createFrameCoalescer(frames.scheduler);
    const update = vi.fn();

    coalescer.schedule(update);
    frames.paint();
    coalescer.schedule(update);
    frames.paint();

    expect(update).toHaveBeenCalledTimes(2);
  });

  it("applies a waiting update at once when flushed", () => {
    const frames = steppedFrames();
    const coalescer = createFrameCoalescer(frames.scheduler);
    const update = vi.fn();

    coalescer.schedule(update);
    coalescer.flush();
    frames.paint();

    expect(update).toHaveBeenCalledTimes(1);
    expect(frames.waiting()).toBe(0);
  });

  it("drops a waiting update when cancelled", () => {
    const frames = steppedFrames();
    const coalescer = createFrameCoalescer(frames.scheduler);
    const update = vi.fn();

    coalescer.schedule(update);
    coalescer.cancel();
    frames.paint();
    coalescer.flush();

    expect(update).not.toHaveBeenCalled();
  });
});
