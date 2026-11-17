"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

interface HoldOptions {
  readonly enabled: boolean;
  /** The person started holding the deck. */
  readonly onHold: () => void;
  /** They let go after `heldMs`; a tap or Enter lets go at once. */
  readonly onRelease: (heldMs: number) => void;
  readonly now?: () => number;
}

const HOLD_KEY = " ";

/**
 * Press and hold to keep shuffling, by pointer or the space bar; a click or
 * Enter shuffles one round. Release is heard on the window, so letting go
 * outside the button still ends the shuffle.
 */
export function useHoldToShuffle({
  enabled,
  onHold,
  onRelease,
  now = () => performance.now(),
}: HoldOptions) {
  const heldSince = useRef<number | undefined>(undefined);
  /** Set right after a release, so the click it causes is ignored. */
  const swallowClick = useRef(false);
  const detach = useRef<() => void>(() => undefined);
  const latest = useRef({ onHold, onRelease, now });
  useEffect(() => {
    latest.current = { onHold, onRelease, now };
  });
  useEffect(() => () => detach.current(), []);

  function release() {
    const since = heldSince.current;
    if (since === undefined) return;
    heldSince.current = undefined;
    detach.current();
    detach.current = () => undefined;
    // The browser follows a press with a click in the same task; that click
    // is this release, not a second shuffle.
    swallowClick.current = true;
    setTimeout(() => {
      swallowClick.current = false;
    }, 0);
    latest.current.onRelease(latest.current.now() - since);
  }

  function hold() {
    if (!enabled || heldSince.current !== undefined) return;
    heldSince.current = latest.current.now();
    latest.current.onHold();
  }

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      hold();
      if (heldSince.current === undefined) return;
      const end = () => release();
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      detach.current = () => {
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
      };
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (event.key !== HOLD_KEY || event.repeat) return;
      event.preventDefault();
      hold();
    },
    onKeyUp(event: KeyboardEvent<HTMLElement>) {
      if (event.key !== HOLD_KEY) return;
      event.preventDefault();
      release();
    },
    /** Enter, or an assistive technology's activation: one round. */
    onClick() {
      if (swallowClick.current) {
        swallowClick.current = false;
        return;
      }
      if (!enabled) return;
      latest.current.onHold();
      latest.current.onRelease(0);
    },
  };
}
