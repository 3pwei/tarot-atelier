"use client";

import { useSyncExternalStore } from "react";

/**
 * enhanced: GSAP timelines and full-resolution burn.
 * css: low-concurrency devices; CSS keyframes and a lighter burn.
 * reduced: user asked for reduced motion; transitions are skipped.
 */
export type MotionMode = "enhanced" | "css" | "reduced";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function detectMotionMode(): MotionMode {
  if (window.matchMedia?.(REDUCED_QUERY).matches) return "reduced";
  const cores = navigator.hardwareConcurrency;
  return cores > 0 && cores <= 4 ? "css" : "enhanced";
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
    () => "enhanced",
  );
}
