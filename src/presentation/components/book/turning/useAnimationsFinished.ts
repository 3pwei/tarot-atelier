"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls `onFinished` once every CSS animation inside `root` has played out.
 * A turn's first frame can take a while to build on a slow machine, and its
 * animations only start then, so a timer started on mount would cut them
 * short. Where the browser cannot list animations (as in tests), it waits
 * `durationMs` instead.
 */
export function useAnimationsFinished(
  root: RefObject<HTMLElement | null>,
  durationMs: number,
  onFinished: () => void,
): void {
  const callback = useRef(onFinished);
  useEffect(() => {
    callback.current = onFinished;
  });

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let live = true;
    const finish = () => {
      if (live) callback.current();
    };
    if (typeof element.getAnimations !== "function") {
      const timer = window.setTimeout(finish, durationMs);
      return () => {
        live = false;
        window.clearTimeout(timer);
      };
    }
    const animations = element.getAnimations({ subtree: true });
    Promise.all(animations.map((animation) => animation.finished)).then(
      finish,
      // Cancelled because the turn ended another way: nothing to do.
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [root, durationMs]);
}
