"use client";

import { useRef, useState, type Dispatch, type RefObject } from "react";
import type { Deck } from "@/domain/deck/deck";
import {
  DrawExperience,
  type DrawState,
  type JumperMode,
  type RandomSource,
} from "@/domain/deck/draw";
import { nextPositionToDraw, validateSpread } from "@/domain/spread/spread";
import { collectDrawnInstances } from "@/domain/spread/spreadSnapshot";
import type { Spread, SpreadPosition } from "@/domain/spread/types";
import {
  buildDrawTimeline,
  buildShuffleTimeline,
} from "@/presentation/components/draw/drawTimelines";
import type { MotionMode } from "@/presentation/components/draw/useMotionMode";
import { usePhaseAnimation } from "@/presentation/components/draw/usePhaseAnimation";
import type { SpreadAction } from "@/presentation/components/spread/spreadState";

/** Matches the CSS keyframe lengths used when GSAP is not loaded. */
const CSS_SHUFFLE_MS = 1300;
const CSS_DRAW_MS = 950;

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
  const first = validateSpread(spread)[0];
  if (!first) return undefined;
  switch (first.code) {
    case "no-positions":
      return "請先新增至少一個牌位";
    case "missing-question":
      return `請先為牌位 ${first.index} 設定問題`;
    case "question-too-long":
      return `牌位 ${first.index} 的問題超過 300 字`;
    case "too-many-positions":
      return "牌位最多 12 個";
    case "main-question-too-long":
      return "主問題超過 300 字";
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

/**
 * Mirrors the domain draw machine for a spread: one shuffled pile, dealt in
 * number order into empty positions, one position at a time.
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
  const flightOrigin = useRef<DOMRect | null>(null);
  const [pile, setPile] = useState<Pile>(() =>
    createPile(deck, spread, randomSource, generation),
  );
  const [phase, setPhase] = useState<DrawState>("idle");
  const [flyingPositionId, setFlyingPositionId] = useState<string>();

  // A restored or cleared spread gets a fresh pile without its table cards.
  if (pile.generation !== generation) {
    setPile(createPile(deck, spread, randomSource, generation));
    setPhase("idle");
    setFlyingPositionId(undefined);
  }

  const experience = pile.experience;
  const remaining = experience.remainingCount;
  const allRevealed = collectDrawnInstances(spread).every((card) =>
    revealedInstanceIds.has(card.instanceId),
  );
  const next = nextPositionToDraw(spread);
  const blocker = spreadBlocker(spread);
  const flyingPosition = spread.positions.find(
    (position) => position.id === flyingPositionId,
  );
  const dealable =
    !loading && !blocker && Boolean(next) && remaining > 0 && allRevealed;
  const canShuffle = dealable && (phase === "idle" || phase === "revealed");
  const canDraw = dealable && (phase === "ready" || phase === "revealed");

  usePhaseAnimation(
    phase === "shuffling",
    motionMode,
    CSS_SHUFFLE_MS,
    () => {
      experience.completeShuffle();
      setPhase(experience.state);
    },
    (gsap, done) => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-shuffle-card]");
      const width = cards[0]?.offsetWidth ?? 160;
      if (cards.length < 2) done();
      else buildShuffleTimeline(gsap, cards, width, done);
    },
    root,
  );

  usePhaseAnimation(
    phase === "drawing",
    motionMode,
    CSS_DRAW_MS,
    () => {
      experience.reveal();
      setPhase(experience.state);
      setFlyingPositionId(undefined);
    },
    (gsap, done) => {
      const from = flightOrigin.current;
      const elements = gsap.utils.toArray<HTMLElement>(
        "[data-flight='pending']",
      );
      if (!from || elements.length === 0) {
        done();
        return;
      }
      const frame = {
        rotation: flyingPosition?.rotation ?? 0,
        scale: tableScale,
      };
      buildDrawTimeline(
        gsap,
        elements.map((element) => ({
          element,
          from,
          frame,
          role: element.dataset.drawCard === "jumper" ? "jumper" : "primary",
        })),
        done,
      );
    },
    root,
  );

  function shuffle() {
    if (!canShuffle) return;
    experience.beginShuffle();
    setPhase(experience.state);
  }

  function draw() {
    if (!canDraw || !next) return;
    if (experience.state === "revealed") experience.continueDrawing();
    flightOrigin.current =
      root.current?.querySelector("[data-deck-top]")?.getBoundingClientRect() ??
      null;
    const result = experience.draw();
    if (!result) return;
    dispatch({ type: "draw", positionId: next.id, result });
    setFlyingPositionId(next.id);
    setPhase(experience.state);
  }

  return {
    phase,
    remaining,
    total: deck.cards.length,
    allRevealed,
    next,
    blocker,
    flyingPosition,
    canShuffle,
    canDraw,
    layoutLocked: loading || phase === "shuffling" || phase === "drawing",
    shuffle,
    draw,
  };
}

export function dealerStatus(options: {
  readonly loading: boolean;
  readonly phase: DrawState;
  readonly blocker?: string;
  readonly next?: SpreadPosition;
  readonly flyingTo?: number;
  readonly allRevealed: boolean;
  readonly remaining: number;
}): string {
  const { loading, phase, blocker, next, flyingTo, allRevealed, remaining } =
    options;
  if (loading) return "正在讀取牌陣";
  if (phase === "shuffling") return "正在洗牌";
  if (phase === "drawing") return `卡牌正飛向牌位 ${flyingTo ?? ""}`;
  if (!allRevealed) return "點擊卡牌，以火焰揭示牌面";
  if (blocker) return blocker;
  if (!next) return "牌陣已完成";
  if (remaining === 0) return "牌堆已用盡";
  if (phase === "idle") return "準備好了，請洗牌";
  return `請為牌位 ${next.index} 抽牌`;
}
