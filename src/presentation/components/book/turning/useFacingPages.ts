"use client";

import { useSyncExternalStore } from "react";

/** Matches `hasFacingPages` and the book's CSS for a spread of two pages. */
export const FACING_PAGES_QUERY =
  "(min-width: 900px) and (min-aspect-ratio: 1/1)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia?.(FACING_PAGES_QUERY);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

/** Whether the frontispiece and the contents face each other on this screen. */
export function useFacingPages(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(FACING_PAGES_QUERY).matches ?? false,
    () => false,
  );
}
