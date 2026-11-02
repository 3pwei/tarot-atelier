"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { MotionMode } from "@/presentation/components/draw/useMotionMode";

type Gsap = typeof import("gsap").gsap;

/**
 * Runs a phase transition: GSAP on capable devices, a fixed CSS duration on
 * low-concurrency devices, and instantly when motion is reduced.
 */
export function usePhaseAnimation(
  active: boolean,
  motionMode: MotionMode,
  cssDurationMs: number,
  finish: () => void,
  animate: (gsap: Gsap, done: () => void) => void,
  scope: RefObject<HTMLElement | null>,
) {
  const latest = useRef({ finish, animate });
  useEffect(() => {
    latest.current = { finish, animate };
  });

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let revert: () => void = () => undefined;
    const done = () => {
      if (!disposed) latest.current.finish();
    };

    if (motionMode === "reduced") {
      done();
    } else if (motionMode === "css") {
      timer = setTimeout(done, cssDurationMs);
    } else {
      void import("gsap")
        .then(({ gsap }) => {
          if (disposed || !scope.current) return;
          const context = gsap.context(
            () => latest.current.animate(gsap, done),
            scope.current,
          );
          revert = () => context.revert();
        })
        .catch(done);
    }

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      revert();
    };
  }, [active, motionMode, cssDurationMs, scope]);
}
