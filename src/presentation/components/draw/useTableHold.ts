"use client";

import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";

/**
 * How long a first finger waits for a second before it counts as a shuffle:
 * the two fingers of a pinch land a few frames apart, and a pinch must zoom.
 */
export const PINCH_GRACE_MS = 100;

/** Targets that keep their own press, such as the deck itself. */
const OWN_GESTURE = "[data-own-gesture]";

interface TableHoldOptions {
  /** True while a press on the table should shuffle. */
  readonly enabled: boolean;
  /** Starts holding the deck; letting go of the pointer ends it. */
  readonly press: () => void;
  /** One quick round. */
  readonly tap: () => void;
  readonly pinchGraceMs?: number;
  readonly schedule?: (run: () => void, ms: number) => () => void;
}

function scheduleTimeout(run: () => void, ms: number): () => void {
  const id = setTimeout(run, ms);
  return () => clearTimeout(id);
}

type Press =
  | { readonly kind: "idle" }
  | { readonly kind: "waiting"; readonly cancel: () => void }
  | { readonly kind: "shuffling" }
  | { readonly kind: "pinching" };

const IDLE: Press = { kind: "idle" };

/**
 * Press anywhere on the table to shuffle, positions included, as if the deck
 * itself were held. A finger waits a moment for a second one, so a two-finger
 * pinch still zooms; a mouse or pen shuffles at once. The click that follows a
 * shuffle is swallowed, so it does not also select a position.
 */
export function useTableHold({
  enabled,
  press,
  tap,
  pinchGraceMs = PINCH_GRACE_MS,
  schedule = scheduleTimeout,
}: TableHoldOptions) {
  const state = useRef<Press>(IDLE);
  const pointers = useRef(new Set<number>());
  const swallowClick = useRef(false);
  const latest = useRef({ press, tap });
  useEffect(() => {
    latest.current = { press, tap };
  });
  useEffect(
    () => () => {
      if (state.current.kind === "waiting") state.current.cancel();
    },
    [],
  );

  function shuffled() {
    swallowClick.current = true;
    setTimeout(() => {
      swallowClick.current = false;
    }, 0);
  }

  function lifted(pointerId: number) {
    pointers.current.delete(pointerId);
    const current = state.current;
    if (current.kind === "waiting") {
      current.cancel();
      latest.current.tap();
      shuffled();
    }
    if (current.kind === "shuffling") shuffled();
    if (pointers.current.size === 0) state.current = IDLE;
  }

  function track(pointerId: number) {
    pointers.current.add(pointerId);
    const end = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      lifted(pointerId);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  function start() {
    state.current = { kind: "shuffling" };
    latest.current.press();
  }

  return {
    onPointerDownCapture(event: PointerEvent<HTMLElement>) {
      const target = event.target;
      if (target instanceof Element && target.closest(OWN_GESTURE)) return;
      const current = state.current;
      if (current.kind === "waiting") {
        // A second finger: this is a pinch, not a shuffle.
        current.cancel();
        state.current = { kind: "pinching" };
        track(event.pointerId);
        return;
      }
      if (!enabled || current.kind !== "idle" || event.button !== 0) return;
      track(event.pointerId);
      if (event.pointerType !== "touch") {
        start();
        return;
      }
      state.current = {
        kind: "waiting",
        cancel: schedule(start, pinchGraceMs),
      };
    },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!swallowClick.current) return;
      swallowClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
