"use client";

import { useEffect, useRef } from "react";
import type { MotionMode } from "@/presentation/components/draw/useMotionMode";

/**
 * Ends a phase whose motion is played by CSS keyframes: after `durationMs`,
 * or at once when motion is reduced.
 */
export function usePhaseAnimation(
  active: boolean,
  motionMode: MotionMode,
  durationMs: number,
  finish: () => void,
) {
  const latest = useRef(finish);
  useEffect(() => {
    latest.current = finish;
  });

  useEffect(() => {
    if (!active) return;
    if (motionMode === "reduced") {
      latest.current();
      return;
    }
    const timer = setTimeout(() => latest.current(), durationMs);
    return () => clearTimeout(timer);
  }, [active, motionMode, durationMs]);
}
