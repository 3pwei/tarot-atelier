"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  type TurnDirection,
  type TurnPlan,
} from "@/presentation/components/book/turning/turnPlan";

export interface ActiveTurn {
  readonly plan: TurnPlan;
  readonly from: BookPlace;
  readonly to: BookPlace;
  /** Within a place, what its pages print before and after the leaf turns. */
  readonly prints?: LeafPrints;
}

/**
 * Still copies of a whole page (both halves of the open book), printed on
 * a leaf turning within a place. One left out is blank paper, as a live
 * table cannot be copied.
 */
export interface LeafPrints {
  readonly leaving?: ReactNode;
  readonly arriving?: ReactNode;
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
  /** Lands `turn` once its animations have played out. */
  readonly finishTurn: (turn: ActiveTurn) => void;
  /**
   * Turns one leaf within the place shown, as a chapter does between its
   * table and its reading. The place stays; nothing turns with reduced
   * motion or while another turn plays.
   */
  readonly turnLeaf: (direction: TurnDirection, prints: LeafPrints) => void;
  /**
   * A leaf is turning within the place shown. The page keeps what it showed
   * until this ends, then changes in the same frame the leaf is lifted away.
   */
  readonly leafTurning: boolean;
}

/**
 * How long past its own length a turn waits for its animations to finish (a
 * slow machine builds the first frame late) before it lands anyway.
 */
export const TURN_GRACE_MS = 1500;

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
 * Plays a turn whenever the reader moves, then shows the new place once the
 * turn's animations report they have finished (`finishTurn`), or at the
 * latest `TURN_GRACE_MS` after the turn should have ended. Reduced motion
 * never turns.
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
  const [state, setState] = useState<TurnState>({
    place,
    shown: place,
    turn: undefined,
    arrival: "swapped",
  });

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
      // A turn leaves the page beneath untouched, arrival included:
      // restyling it would repaint the whole book in the turn's first frame.
      arrival: turn ? state.arrival : "swapped",
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
      () => setState((current) => landed(current, turn)),
      duration + TURN_GRACE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [turn]);

  const finishTurn = useCallback(
    (finished: ActiveTurn) => setState((current) => landed(current, finished)),
    [],
  );

  const reduced = useRef(reducedMotion);
  useEffect(() => {
    reduced.current = reducedMotion;
  });
  const turnLeaf = useCallback(
    (direction: TurnDirection, prints: LeafPrints) => {
      if (reduced.current) return;
      setState((now) =>
        now.turn
          ? now
          : {
              ...now,
              turn: {
                plan: { kind: "single", direction },
                from: now.shown,
                to: now.shown,
                prints,
              },
            },
      );
    },
    [],
  );

  return {
    shown: state.shown,
    turn,
    arrival: state.arrival,
    finishTurn,
    turnLeaf,
    leafTurning: turn !== undefined && samePlace(turn.from, turn.to),
  };
}

const NO_TURN: TurnPlan = Object.freeze({ kind: "none" });

interface TurnState {
  readonly place: BookPlace;
  readonly shown: BookPlace;
  readonly turn: ActiveTurn | undefined;
  readonly arrival: Arrival;
}

/** Shows where `turn` led, if it is still the turn in progress. */
function landed(state: TurnState, turn: ActiveTurn): TurnState {
  if (state.turn !== turn) return state;
  return { ...state, shown: turn.to, turn: undefined, arrival: "turned" };
}
