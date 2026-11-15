"use client";

import { useSyncExternalStore } from "react";

/**
 * animated: lightweight CSS motion, the same on every device.
 * reduced: the person asked their system for less motion; transitions are skipped.
 */
export type MotionMode = "animated" | "reduced";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function detectMotionMode(): MotionMode {
  return window.matchMedia?.(REDUCED_QUERY).matches ? "reduced" : "animated";
}

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia?.(REDUCED_QUERY);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

export function useMotionMode(): MotionMode {
  return useSyncExternalStore<MotionMode>(
    subscribe,
    detectMotionMode,
    () => "animated",
  );
}
