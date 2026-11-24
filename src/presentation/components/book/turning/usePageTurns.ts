"use client";

import { useEffect, useRef, useState } from "react";
import type { PageSound } from "@/application/ports/pageSound";
import type { BookPlace } from "@/presentation/components/book/bookPlace";
import { samePlace } from "@/presentation/components/book/bookPlace";
import type { ContentsEntry } from "@/presentation/components/book/contents";
import { openingMs } from "@/presentation/components/book/turning/opening";
import {
  riffleTimeline,
  SINGLE_TURN_MS,
} from "@/presentation/components/book/turning/timing";
import {
  planTurn,
  type TurnPlan,
} from "@/presentation/components/book/turning/turnPlan";

export interface ActiveTurn {
  readonly plan: TurnPlan;
  readonly from: BookPlace;
  readonly to: BookPlace;
}

export interface PageTurnsOptions {
  readonly place: BookPlace;
  /** The reader moved there; otherwise the place simply appears. */
  readonly turned: boolean;
  readonly entries: readonly ContentsEntry[] | undefined;
  readonly facingPages: boolean;
  readonly reducedMotion: boolean;
  readonly sound: PageSound;
  readonly soundOn: boolean;
}

/** How the page now shown arrived: turned into view, or simply swapped in. */
export type Arrival = "turned" | "swapped";

export interface PageTurns {
  /** What the book shows now; it catches up with the place once a turn ends. */
  readonly shown: BookPlace;
  readonly turn: ActiveTurn | undefined;
  readonly arrival: Arrival;
}

/** How long a turn lasts; zero means it simply swaps. */
export function turnDurationMs(plan: TurnPlan): number {
  switch (plan.kind) {
    case "open":
      return openingMs();
    case "single":
      return SINGLE_TURN_MS;
    case "riffle":
      return riffleTimeline().totalMs;
    case "none":
    case "close":
      return 0;
  }
}

/**
 * Plays a turn whenever the reader moves, then shows the new place. Moving
 * again before a turn ends lands it at once; reduced motion never turns.
 */
export function usePageTurns({
  place,
  turned,
  entries,
  facingPages,
  reducedMotion,
  sound,
  soundOn,
}: PageTurnsOptions): PageTurns {
  const [state, setState] = useState<{
    readonly place: BookPlace;
    readonly shown: BookPlace;
    readonly turn: ActiveTurn | undefined;
    readonly arrival: Arrival;
  }>({ place, shown: place, turn: undefined, arrival: "swapped" });

  // A new place: decide the turn while rendering, so nothing flashes first.
  if (!samePlace(state.place, place)) {
    const plan =
      turned && !reducedMotion && entries && !state.turn
        ? planTurn(state.shown, place, { entries, facingPages })
        : NO_TURN;
    const turn =
      turnDurationMs(plan) > 0
        ? { plan, from: state.shown, to: place }
        : undefined;
    setState({
      place,
      shown: turn ? state.shown : place,
      turn,
      // The pages a turn lays underneath are already in place: no fade.
      arrival: turn ? "turned" : "swapped",
    });
  }

  const { turn } = state;
  const soundRef = useRef({ sound, soundOn });
  useEffect(() => {
    soundRef.current = { sound, soundOn };
  });

  useEffect(() => {
    if (!turn) return;
    const duration = turnDurationMs(turn.plan);
    const { sound: player, soundOn: audible } = soundRef.current;
    if (audible)
      player.play(turn.plan.kind === "single" ? "turn" : "riffle", duration);
    const timer = window.setTimeout(
      () =>
        setState((current) => ({
          ...current,
          shown: turn.to,
          turn: undefined,
          arrival: "turned",
        })),
      duration,
    );
    return () => window.clearTimeout(timer);
  }, [turn]);

  return { shown: state.shown, turn, arrival: state.arrival };
}

const NO_TURN: TurnPlan = Object.freeze({ kind: "none" });
