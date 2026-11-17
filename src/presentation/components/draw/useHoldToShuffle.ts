"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

/** What the deck itself listens to; pointers press the whole table. */
export interface HoldHandlers {
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onKeyUp: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onClick: () => void;
}

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
 * anywhere still ends the shuffle.
 *
 * `handlers` are the deck's keys and activation; `press` and `tap` let the
 * surface the pointer presses, the whole table, start the same hold.
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

  /** Starts a hold that ends when any pointer is let go. */
  function press() {
    hold();
    if (heldSince.current === undefined) return;
    const end = () => release();
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    detach.current = () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }

  /** One round, as a quick tap or Enter gives. */
  function tap() {
    if (!enabled || heldSince.current !== undefined) return;
    latest.current.onHold();
    latest.current.onRelease(0);
  }

  const handlers: HoldHandlers = {
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
      tap();
    },
  };

  return { handlers, press, tap };
}
