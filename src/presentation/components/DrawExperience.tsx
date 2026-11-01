"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import {
  DrawExperience as DrawExperienceDomain,
  JUMPER_PROBABILITIES,
  type DrawResult,
  type DrawState,
  type JumperMode,
  type RandomSource,
} from "@/domain/deck/draw";
import type { CardDefinition, CardInstance } from "@/domain/deck/types";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import { CardArtwork } from "@/presentation/components/CardArtwork";

type MotionMode = "enhanced" | "css" | "reduced";

const CSS_SHUFFLE_DURATION_MS = 980;
const CSS_DRAW_DURATION_MS = 1_600;

const jumperOptions = [
  { id: "off", label: "éé", detail: "0%" },
  { id: "rare", label: "ç¨æ", detail: "3%" },
  { id: "normal", label: "ä¸è¬", detail: "8%" },
  { id: "chaos", label: "æ··æ²", detail: "15%" },
] as const satisfies readonly {
  readonly id: JumperMode;
  readonly label: string;
  readonly detail: string;
}[];

const stateLabels: Readonly<Record<DrawState, string>> = {
  idle: "ç­å¾æ´ç",
  shuffling: "æå±æ­£å¨æ´ç",
  ready: "çå å·²å°±ç·ï¼è«æ½ä¸å¼µ",
  drawing: "å¡çæ­£å¨åå¾å¾æ¾å",
  revealed: "çé¢å·²æ­ç¤º",
};

interface DrawExperienceProps {
  readonly randomSource?: RandomSource;
  readonly initialJumperMode?: JumperMode;
}

function detectMotionMode(): MotionMode {
  if (typeof window === "undefined") return "enhanced";
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return "reduced";
  }
  const lowConcurrency =
    navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
  return lowConcurrency ? "css" : "enhanced";
}

function subscribeToMotionPreference(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  mediaQuery?.addEventListener("change", onChange);
  return () => mediaQuery?.removeEventListener("change", onChange);
}

function DrawnCard({
  card,
  instance,
  role,
}: Readonly<{
  card: CardDefinition;
  instance: CardInstance;
  role: "primary" | "jumper";
}>) {
  const roleLabel = role === "jumper" ? "è·³ç" : "ä¸»ç";
  return (
    <article
      className={`drawn-card drawn-card--${role}`}
      data-draw-card={role}
      aria-label={`${roleLabel}ï¼${card.name.zhHant}ï¼${instance.orientation === "reversed" ? "éä½" : "æ­£ä½"}`}
    >
      {role === "jumper" && <span className="jumper-label">è·³ç</span>}
      <div className="drawn-card__inner">
        <div className="drawn-card__side drawn-card__back" aria-hidden="true">
          <CardArtwork card={card} side="back" orientation="upright" />
        </div>
        <div className="drawn-card__side drawn-card__face">
          <CardArtwork
            card={card}
            side="face"
            orientation={instance.orientation}
          />
        </div>
      </div>
      <span className="drawn-card__shine" aria-hidden="true" />
      <div className="drawn-card__scorch" data-scorch-reveal aria-hidden="true">
        <span />
      </div>
      <div className="drawn-card__caption">
        <strong>{card.name.zhHant}</strong>
        <span>{instance.orientation === "reversed" ? "éä½" : "æ­£ä½"}</span>
      </div>
    </article>
  );
}

export function DrawExperience({
  randomSource,
  initialJumperMode = "rare",
}: DrawExperienceProps = {}) {
  const root = useRef<HTMLDivElement>(null);
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
  const motionMode = useSyncExternalStore(
    subscribeToMotionPreference,
    detectMotionMode,
    () => "enhanced",
  );

  useEffect(() => {
    if (phase !== "shuffling") return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cleanup: () => void = () => undefined;
    const finish = () => {
      if (disposed) return;
      experience.completeShuffle();
      setPhase(experience.state);
    };

    if (motionMode === "reduced") {
      finish();
    } else if (motionMode === "css") {
      timer = setTimeout(finish, CSS_SHUFFLE_DURATION_MS);
    } else {
      void import("gsap")
        .then(({ gsap }) => {
          if (disposed || !root.current) return;
          const context = gsap.context(() => {
            const timeline = gsap.timeline({ onComplete: finish });
            for (let cycle = 0; cycle < 4; cycle += 1) {
              timeline
                .to("[data-deck-layer='top']", {
                  x: -42,
                  rotation: -8,
                  duration: 0.093,
                  ease: "power2.out",
                })
                .to(
                  "[data-deck-layer='middle']",
                  {
                    x: 36,
                    rotation: 7,
                    duration: 0.093,
                    ease: "power2.out",
                  },
                  "<",
                )
                .to("[data-deck-layer]", {
                  x: 0,
                  rotation: 0,
                  duration: 0.14,
                  stagger: 0.017,
                  ease: "back.out(1.7)",
                });
            }
          }, root);
          cleanup = () => context.revert();
        })
        .catch(finish);
    }

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      cleanup();
    };
  }, [experience, motionMode, phase]);

  useEffect(() => {
    if (phase !== "drawing") return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cleanup: () => void = () => undefined;
    const finish = () => {
      if (disposed) return;
      experience.reveal();
      setPhase(experience.state);
    };

    if (motionMode === "reduced") {
      finish();
    } else if (motionMode === "css") {
      timer = setTimeout(finish, CSS_DRAW_DURATION_MS);
    } else {
      void import("gsap")
        .then(({ gsap }) => {
          if (disposed || !root.current) return;
          const context = gsap.context(() => {
            const cards = gsap.utils.toArray<HTMLElement>("[data-draw-card]");
            const timeline = gsap.timeline({ onComplete: finish });
            timeline
              .fromTo(
                cards,
                { y: 150, x: 70, rotation: 10, scale: 0.7, opacity: 0 },
                {
                  y: 0,
                  x: 0,
                  rotation: 0,
                  scale: 1,
                  opacity: 1,
                  duration: 0.72,
                  stagger: 0.14,
                  ease: "power3.out",
                },
              )
              .fromTo(
                ".drawn-card__scorch",
                { opacity: 0, clipPath: "circle(0% at 50% 50%)" },
                {
                  opacity: 1,
                  clipPath: "circle(78% at 50% 50%)",
                  duration: 0.76,
                  stagger: 0.12,
                  ease: "power2.inOut",
                },
                ">-0.08",
              )
              .set(".drawn-card__back", { opacity: 0 }, "<-0.4")
              .set(".drawn-card__face", { opacity: 1 }, "<")
              .to(
                ".drawn-card__scorch",
                {
                  opacity: 0,
                  duration: 0.34,
                  stagger: 0.08,
                  ease: "power2.out",
                },
                "<-0.18",
              )
              .fromTo(
                ".drawn-card__face",
                { filter: "brightness(1.45) saturate(1.28)" },
                {
                  filter: "brightness(1) saturate(1)",
                  duration: 0.52,
                  stagger: 0.1,
                  ease: "power2.out",
                },
                "<-0.32",
              );
          }, root);
          cleanup = () => context.revert();
        })
        .catch(finish);
    }

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      cleanup();
    };
  }, [experience, motionMode, phase]);

  function shuffle() {
    if (phase === "revealed" && remainingCount === 0) {
      experience.reset();
      setRemainingCount(deck.cards.length);
    }
    setResult(undefined);
    experience.beginShuffle();
    setPhase(experience.state);
  }

  function draw() {
    if (phase !== "ready") return;
    const nextResult = experience.draw();
    if (!nextResult) return;
    setResult(nextResult);
    setRemainingCount(experience.remainingCount);
    setPhase(experience.state);
  }

  const primaryCard = result ? deck.getCard(result.primary.cardId) : undefined;
  const jumperCard = result?.jumper
    ? deck.getCard(result.jumper.cardId)
    : undefined;
  const canShuffle = phase === "idle" || phase === "revealed";

  return (
    <div
      ref={root}
      className="draw-experience"
      data-phase={phase}
      data-motion={motionMode}
    >
      <div className="draw-toolbar">
        <label className="jumper-mode-label" htmlFor="jumper-mode">
          <span>è·³çé »ç</span>
          <select
            id="jumper-mode"
            value={jumperMode}
            disabled={phase !== "idle"}
            onChange={(event) =>
              setJumperMode(event.target.value as JumperMode)
            }
          >
            {jumperOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} Â· {option.detail}
              </option>
            ))}
          </select>
        </label>
        <div className="draw-status" aria-live="polite">
          <span className="draw-status__light" aria-hidden="true" />
          <strong>{stateLabels[phase]}</strong>
          <span>å©é¤ {remainingCount} å¼µ</span>
        </div>
        <button
          className="secondary-action"
          type="button"
          disabled={!canShuffle}
          onClick={shuffle}
        >
          {remainingCount === 0 ? "éæ°è£ç" : "æ´ç"}
        </button>
      </div>

      <div className="draw-stage">
        <div className="card-fan" aria-hidden="true">
          {[-3, -2, -1, 0, 1, 2, 3].map((offset) => (
            <span
              key={offset}
              style={{ "--fan-index": offset } as React.CSSProperties}
            />
          ))}
        </div>

        <button
          className="draw-pile"
          type="button"
          disabled={phase !== "ready" || remainingCount === 0}
          onClick={draw}
          aria-label={
            phase === "ready"
              ? "å¾çå æ½ä¸å¼µç"
              : `çå ç®å${stateLabels[phase]}`
          }
        >
          <span data-deck-layer="bottom" />
          <span data-deck-layer="middle" />
          <span data-deck-layer="top" />
          <em>{phase === "ready" ? "é»ææ½ç" : "Tarot Atelier"}</em>
        </button>

        <div
          className={`waiting-zone ${result ? "waiting-zone--occupied" : ""}`}
          aria-label="å¾æ¾å"
        >
          {result && primaryCard ? (
            <div className="drawn-pair" data-card-total={result.jumper ? 2 : 1}>
              <DrawnCard
                card={primaryCard}
                instance={result.primary}
                role="primary"
              />
              {result.jumper && jumperCard && (
                <DrawnCard
                  card={jumperCard}
                  instance={result.jumper}
                  role="jumper"
                />
              )}
            </div>
          ) : (
            <div className="waiting-zone__empty">
              <span aria-hidden="true">â¦</span>
              <strong>å¾æ¾å</strong>
              <small>æ´çå¾ï¼ä»¥æ»é¼ ãè§¸æ§æéµç¤æ½ç</small>
            </div>
          )}
        </div>
      </div>

      <div className="draw-footnote">
        <span>
          {jumperOptions.find((option) => option.id === jumperMode)?.label}æ¨¡å¼
          Â· æ¯æ¬¡æå¤ä¸å¼µè·³ç Â· {JUMPER_PROBABILITIES[jumperMode] * 100}%
        </span>
        {result && phase === "revealed" && (
          <time dateTime={result.drawnAt}>
            æ½çæé {new Date(result.drawnAt).toLocaleTimeString("zh-TW")}
          </time>
        )}
      </div>
    </div>
  );
}
