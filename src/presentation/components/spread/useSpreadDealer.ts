"use client";

import { useRef, useState, type Dispatch, type RefObject } from "react";
import type { Deck } from "@/domain/deck/deck";
import {
  DrawExperience,
  type DrawState,
  type JumperMode,
  type RandomSource,
} from "@/domain/deck/draw";
import { validateSpread } from "@/domain/spread/spread";
import { collectDrawnInstances } from "@/domain/spread/spreadSnapshot";
import type { Spread } from "@/domain/spread/types";
import {
  buildDrawTimeline,
  buildShuffleTimeline,
  DEAL_STAGGER_MS,
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
      return "請按「編輯牌陣」新增至少一個牌位";
    case "missing-question":
      return `請按「編輯牌陣」為牌位 ${first.index} 設定問題`;
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
  /** Positions whose cards are in flight, in dealing order. */
  const [flyingIds, setFlyingIds] = useState<readonly string[]>([]);
  /** Flying positions whose primary card has already touched down. */
  const [landedIds, setLandedIds] = useState<readonly string[]>([]);

  // A restored or cleared spread gets a fresh pile without its table cards.
  if (pile.generation !== generation) {
    setPile(createPile(deck, spread, randomSource, generation));
    setPhase("idle");
    setFlyingIds([]);
  }

  const experience = pile.experience;
  const remaining = experience.remainingCount;
  const allRevealed = collectDrawnInstances(spread).every((card) =>
    revealedInstanceIds.has(card.instanceId),
  );
  /** Every empty position, in number order: one deck click deals them all. */
  const empty = spread.positions.filter((position) => !position.drawResult);
  const next = empty[0];
  const blocker = spreadBlocker(spread);
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
    CSS_DRAW_MS + Math.max(0, flyingIds.length - 1) * DEAL_STAGGER_MS,
    () => {
      experience.reveal();
      setPhase(experience.state);
      setFlyingIds([]);
      setLandedIds([]);
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
      buildDrawTimeline(
        gsap,
        elements.map((element) => {
          const slotId =
            element.closest<HTMLElement>("[data-slot]")?.dataset.slot;
          const position = spread.positions.find((p) => p.id === slotId);
          const role =
            element.dataset.drawCard === "jumper" ? "jumper" : "primary";
          return {
            element,
            from,
            frame: { rotation: position?.rotation ?? 0, scale: tableScale },
            order: Math.max(0, flyingIds.indexOf(slotId ?? "")),
            role,
            onLanded:
              role === "primary" && slotId
                ? () => setLandedIds((ids) => [...ids, slotId])
                : undefined,
          };
        }),
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

  /** Deals every empty position at once; the person then reveals each card. */
  function deal() {
    if (!canDraw || empty.length === 0) return;
    if (experience.state === "revealed") experience.continueDrawing();
    flightOrigin.current =
      root.current?.querySelector("[data-deck-top]")?.getBoundingClientRect() ??
      null;
    const results = experience.drawSeries(empty.length);
    if (results.length === 0) return;
    const dealt = results.flatMap((result, order) => {
      const position = empty[order];
      return position ? [{ positionId: position.id, result }] : [];
    });
    dispatch({ type: "deal", dealt });
    if (dealt.length < empty.length) {
      dispatch({
        type: "announce",
        text: `牌堆只剩 ${dealt.length} 次可發，其餘牌位暫時留空。`,
      });
    }
    setFlyingIds(dealt.map((item) => item.positionId));
    setPhase(experience.state);
  }

  return {
    phase,
    remaining,
    total: deck.cards.length,
    allRevealed,
    next,
    emptyCount: empty.length,
    blocker,
    flyingIds,
    /** Positions whose card is still on its way; they keep their number. */
    awaitingIds:
      phase === "drawing"
        ? flyingIds.filter((id) => !landedIds.includes(id))
        : [],
    canShuffle,
    canDraw,
    layoutLocked: loading || phase === "shuffling" || phase === "drawing",
    shuffle,
    deal,
  };
}

export function dealerStatus(options: {
  readonly loading: boolean;
  readonly phase: DrawState;
  readonly blocker?: string;
  readonly emptyCount: number;
  readonly flyingCount: number;
  readonly allRevealed: boolean;
  readonly remaining: number;
}): string {
  const {
    loading,
    phase,
    blocker,
    emptyCount,
    flyingCount,
    allRevealed,
    remaining,
  } = options;
  if (loading) return "正在讀取牌陣";
  if (phase === "shuffling") return "正在洗牌";
  if (phase === "drawing") return `正在發牌到 ${flyingCount} 個牌位`;
  if (!allRevealed) return "點擊卡牌，以火焰逐一揭示牌面";
  if (blocker) return blocker;
  if (emptyCount === 0) return "牌陣已完成";
  if (remaining === 0) return "牌堆已用盡";
  if (phase === "idle") return "準備好了，請洗牌";
  return `點擊牌堆，一次發完 ${emptyCount} 個牌位`;
}
