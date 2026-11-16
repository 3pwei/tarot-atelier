"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
} from "react";
import type { Deck } from "@/domain/deck/deck";
import {
  DrawExperience,
  type DrawState,
  type JumperMode,
  type RandomSource,
} from "@/domain/deck/draw";
import { dealingIssues } from "@/domain/spread/spread";
import { collectDrawnInstances } from "@/domain/spread/spreadSnapshot";
import type { Spread } from "@/domain/spread/types";
import {
  jumperSlot,
  openFan,
  pileIndexOf,
  takeSlots,
  type CardFan,
} from "@/presentation/components/draw/cardFan";
import {
  landingDelayMs,
  washAfterRelease,
  type FlightRole,
  type ScreenBox,
} from "@/presentation/components/draw/dealMotion";
import type { MotionMode } from "@/presentation/components/draw/useMotionMode";
import { usePhaseAnimation } from "@/presentation/components/draw/usePhaseAnimation";
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

interface Pile {
  readonly generation: number;
  readonly experience: DrawExperience;
}

/** A pile without the cards already lying on the table. */
function createPile(
  deck: Deck,
  spread: Spread,
  random: RandomSource | undefined,
  generation: number,
): Pile {
  return {
    generation,
    experience: new DrawExperience({
      deckId: deck.id,
      cardIds: deck.cards.map((card) => card.id),
      supportsReversals: deck.manifest.supportsReversals,
      random,
      jumperMode: JUMPER_MODE,
      alreadyDrawnCardIds: collectDrawnInstances(spread).map((c) => c.cardId),
      previousDrawCount: spread.positions.filter((p) => p.drawResult).length,
    }),
  };
}

export function spreadBlocker(spread: Spread): string | undefined {
  const first = dealingIssues(spread)[0];
  if (!first) return undefined;
  switch (first.code) {
    case "no-positions":
      return "請按「編輯牌陣」新增至少一個牌位";
    case "missing-question":
      return `請按「編輯牌陣」為牌位 ${first.index} 設定問題`;
    case "question-too-long":
      return `牌位 ${first.index} 的問題超過 300 字`;
    case "too-many-positions":
      return "牌位最多 12 個";
    case "main-question-too-long":
      return "主問題超過 300 字";
    case "missing-main-question":
      return "請先輸入這次想問的主問題";
  }
}

interface DealerOptions {
  readonly deck: Deck;
  readonly spread: Spread;
  readonly revealedInstanceIds: ReadonlySet<string>;
  /** Changes when the spread is restored or cleared. */
  readonly generation: number;
  readonly loading: boolean;
  readonly randomSource?: RandomSource;
  readonly motionMode: MotionMode;
  readonly root: RefObject<HTMLElement | null>;
  readonly tableScale: number;
  readonly dispatch: Dispatch<SpreadAction>;
}

/** Selector for a card on the wheel; the dealer reads where a jumper leaves from. */
export function fanSlotSelector(slot: number): string {
  return `[data-fan-slot="${slot}"]`;
}

/**
 * Mirrors the domain draw machine for a spread: hold the deck to wash one
 * pile across the table, let go to gather it and lay it on the wheel, then
 * choose a card for each empty position in number order. Nothing is drawn
 * until a card is chosen.
 */
export function useSpreadDealer({
  deck,
  spread,
  revealedInstanceIds,
  generation,
  loading,
  randomSource,
  motionMode,
  root,
  tableScale,
  dispatch,
}: DealerOptions) {
  const [pile, setPile] = useState<Pile>(() =>
    createPile(deck, spread, randomSource, generation),
  );
  const [phase, setPhase] = useState<DrawState>("idle");
  const [holding, setHolding] = useState(false);
  /** Set when the person lets go: how long the wash and gather carry on. */
  const [finishDelay, setFinishDelay] = useState<number | undefined>();
  /** True while the washed cards sweep into one pile. */
  const [gathering, setGathering] = useState(false);
  /** Changes on every shuffle, so each wash takes new paths. */
  const [washSeed, setWashSeed] = useState(generation + 1);
  const [fan, setFan] = useState<CardFan | undefined>();
  /** Positions to fill from this fan, counted when it opened. */
  const [roundTotal, setRoundTotal] = useState(0);
  /** Cards on their way from the fan to the table. */
  const [flights, setFlights] = useState<readonly Flight[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => timers.current.forEach((timer) => clearTimeout(timer)),
    [],
  );
  function after(ms: number, run: () => void) {
    timers.current.push(setTimeout(run, ms));
  }

  // A restored or cleared spread gets a fresh pile without its table cards.
  if (pile.generation !== generation) {
    setPile(createPile(deck, spread, randomSource, generation));
    setPhase("idle");
    setHolding(false);
    setFinishDelay(undefined);
    setGathering(false);
    setFan(undefined);
    setFlights([]);
  }

  const experience = pile.experience;
  const remaining = experience.remainingCount;
  const allRevealed = collectDrawnInstances(spread).every((card) =>
    revealedInstanceIds.has(card.instanceId),
  );
  /** Every empty position, in number order: each gets the next chosen card. */
  const empty = spread.positions.filter((position) => !position.drawResult);
  const next = empty[0];
  const blocker = spreadBlocker(spread);
  const dealable =
    !loading && !blocker && Boolean(next) && remaining > 0 && allRevealed;
  const canShuffle =
    dealable &&
    flights.length === 0 &&
    (phase === "idle" || phase === "revealed");
  const picking = phase === "ready" && fan !== undefined;

  usePhaseAnimation(
    phase === "shuffling" && finishDelay !== undefined,
    motionMode,
    finishDelay ?? 0,
    () => {
      experience.completeShuffle();
      setPhase(experience.state);
      setFinishDelay(undefined);
      setGathering(false);
      setFan(openFan(experience.remainingCount));
      setRoundTotal(empty.length);
    },
  );

  useDealFlights({
    flights,
    root,
    frameOf: (slotId) => ({
      rotation:
        spread.positions.find((position) => position.id === slotId)?.rotation ??
        0,
      scale: tableScale,
    }),
  });

  /** Pressing the deck washes the cards across the table while it is held. */
  function hold() {
    if (!canShuffle) return;
    experience.beginShuffle();
    setPhase(experience.state);
    setHolding(true);
    setFinishDelay(undefined);
    setGathering(false);
    setWashSeed((seed) => seed + 1);
  }

  function release(heldMs: number) {
    if (experience.state !== "shuffling") return;
    const finish = washAfterRelease(heldMs);
    setHolding(false);
    setFinishDelay(finish.washMs + finish.gatherMs);
    if (motionMode === "animated") {
      after(finish.washMs, () => setGathering(true));
    }
  }

  function land(flight: Flight) {
    after(landingDelayMs(flight.role), () =>
      setFlights((current) => current.filter((item) => item !== flight)),
    );
  }

  function launch(
    positionId: string,
    origins: readonly (readonly [FlightRole, ScreenBox])[],
  ) {
    if (motionMode === "reduced") return;
    const launched = origins.map(([role, origin]) => ({
      positionId,
      role,
      origin,
    }));
    setFlights((current) => [...current, ...launched]);
    launched.forEach(land);
  }

  /**
   * The person chose the card in `slot`, which left the fan from `origin`.
   * It goes to the next empty position, with a jumper now and then.
   */
  function pick(slot: number, origin: ScreenBox) {
    if (!picking || !next || fan.taken.has(slot)) return;
    const result = experience.drawAt(pileIndexOf(fan, slot));
    if (!result) return;
    const jumperFrom = result.jumper ? jumperSlot(fan, slot) : undefined;
    const jumperOrigin =
      jumperFrom === undefined
        ? undefined
        : root.current
            ?.querySelector(fanSlotSelector(jumperFrom))
            ?.getBoundingClientRect();
    dispatch({ type: "deal", dealt: [{ positionId: next.id, result }] });
    launch(next.id, [
      ["primary", origin],
      ...(jumperOrigin ? [["jumper", jumperOrigin] as const] : []),
    ]);

    experience.reveal();
    const stillEmpty = empty.length - 1;
    if (stillEmpty > 0 && experience.remainingCount > 0) {
      experience.continueDrawing();
      setFan(
        takeSlots(fan, jumperFrom === undefined ? [slot] : [slot, jumperFrom]),
      );
    } else {
      setFan(undefined);
      if (stillEmpty > 0) {
        dispatch({
          type: "announce",
          text: `牌堆已用盡，還有 ${stillEmpty} 個牌位留空。`,
        });
      }
    }
    setPhase(experience.state);
  }

  return {
    phase,
    holding,
    gathering,
    washSeed,
    remaining,
    total: deck.cards.length,
    allRevealed,
    next,
    emptyCount: empty.length,
    blocker,
    fan: picking ? fan : undefined,
    /** Which card of this fan's round is being chosen, from 1. */
    pickNumber: roundTotal - empty.length + 1,
    roundTotal,
    flights,
    /** Positions whose chosen card is still on its way; they keep their number. */
    awaitingIds: flights
      .filter((flight) => flight.role === "primary")
      .map((flight) => flight.positionId),
    canShuffle,
    /** The pack stays on the table only while it still has positions to fill. */
    deckOnTable: Boolean(next) && remaining > 0,
    /** Starting over works at any moment but mid-wash or mid-flight. */
    canClear: !loading && phase !== "shuffling" && flights.length === 0,
    layoutLocked:
      loading || phase === "shuffling" || picking || flights.length > 0,
    hold,
    release,
    pick,
  };
}

export function dealerStatus(options: {
  readonly loading: boolean;
  readonly phase: DrawState;
  readonly holding: boolean;
  readonly picking: boolean;
  readonly pickNumber: number;
  readonly roundTotal: number;
  readonly blocker?: string;
  readonly emptyCount: number;
  readonly flyingCount: number;
  readonly allRevealed: boolean;
  readonly remaining: number;
}): string {
  const {
    loading,
    phase,
    holding,
    picking,
    pickNumber,
    roundTotal,
    blocker,
    emptyCount,
    flyingCount,
    allRevealed,
    remaining,
  } = options;
  if (loading) return "正在讀取牌陣";
  if (holding) return "洗牌中，放開後收牌攤開";
  if (phase === "shuffling") return "正在洗牌";
  if (picking) {
    return `請選第 ${pickNumber} 張（共 ${roundTotal} 張）：點一下讓牌往前，再往前拉出`;
  }
  if (flyingCount > 0) return "牌正在放到牌位";
  if (!allRevealed) return "點擊卡牌，以火焰逐一揭示牌面";
  if (blocker) return blocker;
  if (emptyCount === 0) return "牌陣已完成";
  if (remaining === 0) return "牌堆已用盡";
  if (phase === "idle") return "準備好了，請洗牌";
  return `請洗牌，再選 ${emptyCount} 張牌`;
}
