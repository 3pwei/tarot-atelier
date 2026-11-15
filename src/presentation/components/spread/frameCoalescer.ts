/** Runs work before the next paint; injected so tests can step frames. */
export interface FrameScheduler {
  request(callback: () => void): number;
  cancel(handle: number): void;
}

export const browserFrameScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

export interface FrameCoalescer {
  /** Keeps only the latest update and runs it before the next paint. */
  schedule(update: () => void): void;
  /** Runs a waiting update now, e.g. when the gesture ends. */
  flush(): void;
  /** Drops a waiting update. */
  cancel(): void;
}

/**
 * Pointers report moves faster than the screen paints, and every move used
 * to re-render the table. Coalescing renders at most once per frame, with
 * the newest position, so nothing is lost but the wasted work.
 */
export function createFrameCoalescer(
  scheduler: FrameScheduler = browserFrameScheduler,
): FrameCoalescer {
  let pending: (() => void) | undefined;
  let handle: number | undefined;

  const run = () => {
    handle = undefined;
    const update = pending;
    pending = undefined;
    update?.();
  };

  return {
    schedule(update) {
      pending = update;
      if (handle === undefined) handle = scheduler.request(run);
    },
    flush() {
      if (handle !== undefined) scheduler.cancel(handle);
      run();
    },
    cancel() {
      if (handle !== undefined) scheduler.cancel(handle);
      handle = undefined;
      pending = undefined;
    },
  };
}
