"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type RefObject,
} from "react";
import type { Deck } from "@/domain/deck/deck";
import type { JumperMode, RandomSource } from "@/domain/deck/draw";
import {
  completeShuffle,
  createDrawPile,
  describeDrawPileIssue,
  drawAt,
  type DrawPile,
  type DrawPileStep,
} from "@/domain/deck/drawPile";
import { collectDrawnInstances } from "@/domain/spread/round";
import type { Spread } from "@/domain/spread/types";
import {
  fanSlotSelector,
  jumperSlot,
  openFan,
  pileIndexOf,
} from "@/presentation/components/draw/cardFan";
import {
  GATHER_MS,
  landingDelayMs,
  tableZoom,
  type FlightRole,
  type ScreenBox,
} from "@/presentation/components/draw/dealMotion";
import type { MotionMode } from "@/presentation/components/draw/useMotionMode";
import { usePhaseAnimation } from "@/presentation/components/draw/usePhaseAnimation";
import {
  dealerReducer,
  dealerView,
  initialDealerState,
} from "@/presentation/components/spread/dealerMachine";
import type { SpreadAction } from "@/presentation/components/spread/spreadState";
import {
  useDealFlights,
  type Flight,
} from "@/presentation/components/spread/useDealFlights";

/**
 * Product rule: every draw uses the fixed `rare` jumper rate. The rate is a
 * deliberate surprise and is never shown to players.
 */
const JUMPER_MODE: JumperMode = "rare";

interface DealerOptions {
  readonly deck: Deck;
  readonly spread: Spread;
  readonly revealedInstanceIds: ReadonlySet<string>;
  /** Changes when the spread is restored or cleared. */
  readonly generation: number;
  readonly loading: boolean;
  readonly randomSource?: RandomSource;
  readonly now?: () => Date;
  readonly motionMode: MotionMode;
  readonly root: RefObject<HTMLElement | null>;
  readonly tableScale: number;
  /** Positions are being arranged: the table is shown at full size. */
  readonly arranging: boolean;
  readonly dispatch: Dispatch<SpreadAction>;
}

/**
 * Deals a spread: hold the deck to wash one pile across the table, let go to
 * gather it and lay it on the wheel, then choose a card for each empty
 * position in number order. Nothing is drawn until a card is chosen. The
 * rules live in `dealerMachine`; this hook adds time, randomness and the DOM.
 */
export function useSpreadDealer({
  deck,
  spread,
  revealedInstanceIds,
  generation,
  loading,
  randomSource = Math.random,
  now = currentTime,
  motionMode,
  root,
  tableScale,
  arranging,
  dispatch,
}: DealerOptions) {
  const [state, send] = useReducer(dealerReducer, undefined, () =>
    initialDealerState(pileFor(deck, spread), generation),
  );
  // A restored or cleared spread gets a fresh pile without its table cards.
  if (state.generation !== generation) {
    send({ type: "reset", generation, pile: pileFor(deck, spread) });
  }

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => timers.current.forEach((timer) => clearTimeout(timer)),
    [],
  );

  const view = dealerView(state, { spread, revealedInstanceIds, loading });
  const { stage } = state;
  const zoom = tableZoom({ arranging, dealing: view.dealing });
  // The wheel is laid out, out of sight, while the heap drops, so it only has
  // to rise once the shuffle completes.
  const waitingFan = useMemo(
    () => (view.gathering ? openFan(view.remaining) : undefined),
    [view.gathering, view.remaining],
  );

  usePhaseAnimation(stage.kind === "gathering", motionMode, GATHER_MS, () =>
    send({
      type: "gathered",
      pile: expected(completeShuffle(state.pile, randomSource)),
      roundTotal: view.emptyCount,
    }),
  );

  useDealFlights({
    flights: state.flights,
    root,
    frameOf: (slotId) => ({
      rotation:
        spread.positions.find((position) => position.id === slotId)?.rotation ??
        0,
      scale: tableScale * zoom,
    }),
  });

  /** Pressing the deck washes the cards across the table while it is held. */
  function hold() {
    if (view.canShuffle) send({ type: "hold" });
  }

  /** Letting go floats the cards down and gathers them, however long it was held. */
  function release() {
    send({ type: "release", animated: motionMode === "animated" });
  }

  function flightsFrom(
    positionId: string,
    origins: readonly (readonly [FlightRole, ScreenBox])[],
  ): readonly Flight[] {
    if (motionMode === "reduced") return [];
    const launched = origins.map(([role, origin]) => ({
      positionId,
      role,
      origin,
    }));
    for (const flight of launched) {
      timers.current.push(
        setTimeout(
          () => send({ type: "landed", flight }),
          landingDelayMs(flight.role),
        ),
      );
    }
    return launched;
  }

  /**
   * The person chose the card in `slot`, which left the wheel from `origin`.
   * It goes to the next empty position, with a jumper now and then.
   */
  function pick(slot: number, origin: ScreenBox) {
    const { next } = view;
    if (stage.kind !== "picking" || !next || stage.fan.taken.has(slot)) return;
    const drawn = drawAt(state.pile, pileIndexOf(stage.fan, slot), {
      random: randomSource,
      now,
    });
    if (!drawn.ok) return;
    const { pile, result } = drawn.value;
    const jumperFrom = result.jumper ? jumperSlot(stage.fan, slot) : undefined;
    const jumperOrigin =
      jumperFrom === undefined
        ? undefined
        : root.current
            ?.querySelector(fanSlotSelector(jumperFrom))
            ?.getBoundingClientRect();

    dispatch({ type: "deal", dealt: [{ positionId: next.id, result }] });
    const positionsLeft = view.emptyCount - 1;
    send({
      type: "picked",
      pile,
      slots: jumperFrom === undefined ? [slot] : [slot, jumperFrom],
      positionsLeft,
      flights: flightsFrom(next.id, [
        ["primary", origin],
        ...(jumperOrigin ? [["jumper", jumperOrigin] as const] : []),
      ]),
    });
    if (positionsLeft > 0 && pile.remainingCardIds.length === 0) {
      dispatch({
        type: "announce",
        text: `牌堆已用盡，還有 ${positionsLeft} 個牌位留空。`,
      });
    }
  }

  return {
    phase: view.phase,
    status: view.status,
    /** The table's zoom while drawing (see `tableZoom`). */
    zoom,
    holding: view.holding,
    gathering: view.gathering,
    washSeed: state.washSeed,
    remaining: view.remaining,
    total: deck.cards.length,
    allRevealed: view.allRevealed,
    next: view.next,
    emptyCount: view.emptyCount,
    fan: stage.kind === "picking" ? stage.fan : waitingFan,
    /** The wheel takes picks; until then it waits below the table. */
    fanReady: view.picking,
    flights: state.flights,
    awaitingIds: view.awaitingIds,
    canShuffle: view.canShuffle,
    deckOnTable: view.deckOnTable,
    canClear: view.canClear,
    layoutLocked: view.layoutLocked,
    hold,
    release,
    pick,
  };
}

/** A pile without the cards already lying on the table. */
function pileFor(deck: Deck, spread: Spread): DrawPile {
  return expected(
    createDrawPile({
      deckId: deck.id,
      cardIds: deck.cards.map((card) => card.id),
      supportsReversals: deck.manifest.supportsReversals,
      jumperMode: JUMPER_MODE,
      alreadyDrawnCardIds: collectDrawnInstances(spread).map(
        (card) => card.cardId,
      ),
      previousDrawCount: spread.positions.filter(
        (position) => position.drawResult,
      ).length,
    }),
  );
}

/**
 * The dealer only takes steps its own state allows, and decks are validated
 * when registered, so a failure here is a bug, not a player's mistake.
 */
function expected(step: DrawPileStep<DrawPile>): DrawPile {
  if (step.ok) return step.value;
  throw new Error(
    `The dealer took a step the draw pile refused: ${describeDrawPileIssue(step.issue)}`,
  );
}

function currentTime(): Date {
  return new Date();
}
