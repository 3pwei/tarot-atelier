"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import {
  DrawExperience as DrawExperienceDomain,
  JUMPER_PROBABILITIES,
  type DrawResult,
  type DrawState,
  type JumperMode,
  type RandomSource,
} from "@/domain/deck/draw";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import { DeckStack } from "@/presentation/components/draw/DeckStack";
import {
  buildDrawTimeline,
  buildShuffleTimeline,
} from "@/presentation/components/draw/drawTimelines";
import {
  DrawnCard,
  type CardRole,
} from "@/presentation/components/draw/DrawnCard";
import {
  JUMPER_OPTIONS,
  JumperModeControl,
} from "@/presentation/components/draw/JumperModeControl";
import { TableOrnament } from "@/presentation/components/draw/TableOrnament";
import {
  useMotionMode,
  type MotionMode,
} from "@/presentation/components/draw/useMotionMode";

/** Matches the CSS keyframe lengths used when GSAP is not loaded. */
const CSS_SHUFFLE_MS = 1300;
const CSS_DRAW_MS = 950;

interface DrawExperienceProps {
  readonly randomSource?: RandomSource;
  readonly initialJumperMode?: JumperMode;
}

function statusText(phase: DrawState, allRevealed: boolean): string {
  switch (phase) {
    case "idle":
      return "等待洗牌";
    case "shuffling":
      return "正在洗牌";
    case "ready":
      return "牌堆已就緒，請抽一張";
    case "drawing":
      return "卡牌正飛向祭壇";
    case "revealed":
      return allRevealed ? "牌面已揭示" : "點擊卡牌，以火焰揭示牌面";
  }
}

/**
 * Runs a phase transition: GSAP on capable devices, a fixed CSS duration on
 * low-concurrency devices, and instantly when motion is reduced.
 */
function usePhaseAnimation(
  active: boolean,
  motionMode: MotionMode,
  cssDurationMs: number,
  finish: () => void,
  animate: (gsap: typeof import("gsap").gsap, done: () => void) => void,
  scope: React.RefObject<HTMLElement | null>,
) {
  const latest = useRef({ finish, animate });
  useEffect(() => {
    latest.current = { finish, animate };
  });

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let revert: () => void = () => undefined;
    const done = () => {
      if (!disposed) latest.current.finish();
    };

    if (motionMode === "reduced") {
      done();
    } else if (motionMode === "css") {
      timer = setTimeout(done, cssDurationMs);
    } else {
      void import("gsap")
        .then(({ gsap }) => {
          if (disposed || !scope.current) return;
          const context = gsap.context(
            () => latest.current.animate(gsap, done),
            scope.current,
          );
          revert = () => context.revert();
        })
        .catch(done);
    }

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      revert();
    };
  }, [active, motionMode, cssDurationMs, scope]);
}

export function DrawExperience({
  randomSource,
  initialJumperMode = "rare",
}: DrawExperienceProps = {}) {
  const root = useRef<HTMLDivElement>(null);
  const flightOrigin = useRef<DOMRect | null>(null);
  const registry = useMemo(
    () => registerBuiltInDecks(new InMemoryDeckRegistry()),
    [],
  );
  const deck = registry.get("atelier-standard-tarot") ?? registry.getSelected();
  const [jumperMode, setJumperMode] = useState<JumperMode>(initialJumperMode);
  const experience = useMemo(
    () =>
      new DrawExperienceDomain({
        deckId: deck.id,
        cardIds: deck.cards.map((card) => card.id),
        supportsReversals: deck.manifest.supportsReversals,
        random: randomSource,
        jumperMode,
      }),
    [deck, jumperMode, randomSource],
  );
  const [phase, setPhase] = useState<DrawState>("idle");
  const [remainingCount, setRemainingCount] = useState(deck.cards.length);
  const [result, setResult] = useState<DrawResult>();
  const [revealedRoles, setRevealedRoles] = useState<ReadonlySet<CardRole>>(
    new Set(),
  );
  const motionMode = useMotionMode();

  const cardTotal = result ? (result.jumper ? 2 : 1) : 0;
  const allRevealed = cardTotal > 0 && revealedRoles.size === cardTotal;

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
    },
    (gsap, done) => {
      const from = flightOrigin.current;
      const elements = gsap.utils.toArray<HTMLElement>("[data-draw-card]");
      if (!from) {
        done();
        return;
      }
      buildDrawTimeline(
        gsap,
        elements.map((element) => ({
          element,
          from,
          role: element.dataset.drawCard === "jumper" ? "jumper" : "primary",
        })),
        done,
      );
    },
    root,
  );

  const handleRevealed = useCallback((role: CardRole) => {
    setRevealedRoles((current) => new Set(current).add(role));
  }, []);

  function shuffle() {
    if (phase === "revealed" && remainingCount === 0) {
      experience.reset();
      setRemainingCount(deck.cards.length);
    }
    setResult(undefined);
    setRevealedRoles(new Set());
    experience.beginShuffle();
    setPhase(experience.state);
  }

  function draw() {
    if (phase !== "ready") return;
    flightOrigin.current =
      root.current?.querySelector("[data-deck-top]")?.getBoundingClientRect() ??
      null;
    const nextResult = experience.draw();
    if (!nextResult) return;
    setResult(nextResult);
    setRevealedRoles(new Set());
    setRemainingCount(experience.remainingCount);
    setPhase(experience.state);
  }

  const primaryCard = result ? deck.getCard(result.primary.cardId) : undefined;
  const jumperCard = result?.jumper
    ? deck.getCard(result.jumper.cardId)
    : undefined;
  const canShuffle = phase === "idle" || (phase === "revealed" && allRevealed);
  const activeOption = JUMPER_OPTIONS.find(
    (option) => option.id === jumperMode,
  );
  const status = statusText(phase, allRevealed);

  return (
    <div
      ref={root}
      className="draw-experience"
      data-phase={phase}
      data-motion={motionMode}
      data-card-total={cardTotal}
      data-all-revealed={allRevealed || undefined}
    >
      <div className="draw-table">
        <div className="draw-table__bar">
          <div className="draw-status" aria-live="polite">
            <span className="draw-status__light" aria-hidden="true" />
            <strong>{status}</strong>
            <span>剩餘 {remainingCount} 張</span>
          </div>
          <div className="draw-table__controls">
            <JumperModeControl
              value={jumperMode}
              disabled={phase !== "idle"}
              onChange={setJumperMode}
            />
            <button
              className="shuffle-action"
              type="button"
              disabled={!canShuffle}
              onClick={shuffle}
            >
              {remainingCount === 0 ? "重新裝牌" : "洗牌"}
            </button>
          </div>
        </div>

        <div className="draw-table__stage">
          <DeckStack
            remaining={remainingCount}
            total={deck.cards.length}
            canDraw={phase === "ready" && remainingCount > 0}
            label={phase === "ready" ? "從牌堆抽一張牌" : `牌堆：${status}`}
            hint={
              phase === "ready"
                ? "點擊牌堆抽牌"
                : `${remainingCount} / ${deck.cards.length}`
            }
            onDraw={draw}
          />

          <section className="altar" aria-label="待放區">
            <TableOrnament />
            {result && primaryCard ? (
              <div className="altar__cards">
                <DrawnCard
                  key={result.primary.instanceId}
                  card={primaryCard}
                  instance={result.primary}
                  role="primary"
                  interactive={phase === "revealed"}
                  motionMode={motionMode}
                  onRevealed={handleRevealed}
                />
                {result.jumper && jumperCard && (
                  <DrawnCard
                    key={result.jumper.instanceId}
                    card={jumperCard}
                    instance={result.jumper}
                    role="jumper"
                    interactive={phase === "revealed"}
                    motionMode={motionMode}
                    onRevealed={handleRevealed}
                  />
                )}
              </div>
            ) : (
              <div className="altar__slot">
                <span className="altar__slot-mark" aria-hidden="true">
                  ✦
                </span>
                <small>
                  {phase === "ready"
                    ? "等待你抽出的牌"
                    : "洗牌後，牌會落在這裡"}
                </small>
              </div>
            )}
          </section>
        </div>

        <div className="draw-table__foot">
          <span>
            {activeOption?.label}模式 · 每次最多一張跳牌 ·{" "}
            {JUMPER_PROBABILITIES[jumperMode] * 100}%
          </span>
          {result && allRevealed && (
            <time dateTime={result.drawnAt}>
              抽牌時間 {new Date(result.drawnAt).toLocaleTimeString("zh-TW")}
            </time>
          )}
        </div>
      </div>
    </div>
  );
}
