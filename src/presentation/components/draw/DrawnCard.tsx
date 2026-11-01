"use client";

import { useCallback, useRef, useState, type MouseEvent } from "react";
import type { CardDefinition, CardInstance } from "@/domain/deck/types";
import { CardArtwork } from "@/presentation/components/CardArtwork";
import { BurnReveal } from "@/presentation/effects/burn/BurnReveal";
import type { IgnitionPoint } from "@/presentation/effects/burn/burnField";
import type { MotionMode } from "./useMotionMode";

export type CardRole = "primary" | "jumper";
type RevealState = "sealed" | "igniting" | "burning" | "revealed";

/** Keyboard activation lights the bottom edge, the way you'd hold a match. */
const KEYBOARD_IGNITION: IgnitionPoint = { x: 0.5, y: 0.94 };

const ROLE_LABELS: Readonly<Record<CardRole, string>> = {
  primary: "主牌",
  jumper: "跳牌",
};

interface DrawnCardProps {
  readonly card: CardDefinition;
  readonly instance: CardInstance;
  readonly role: CardRole;
  /** The card has landed and may be revealed. */
  readonly interactive: boolean;
  readonly motionMode: MotionMode;
  readonly onRevealed: (role: CardRole) => void;
}

function ignitionFromPointer(
  event: MouseEvent<HTMLElement>,
  body: HTMLElement | null,
) {
  // `detail` is 0 for keyboard-triggered clicks.
  if (!body || event.detail === 0) return KEYBOARD_IGNITION;
  const rect = body.getBoundingClientRect();
  const clamp = (value: number) => Math.min(0.97, Math.max(0.03, value));
  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height),
  };
}

export function DrawnCard({
  card,
  instance,
  role,
  interactive,
  motionMode,
  onRevealed,
}: DrawnCardProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>("sealed");
  const [ignition, setIgnition] = useState<IgnitionPoint>(KEYBOARD_IGNITION);
  const roleLabel = ROLE_LABELS[role];
  const orientationLabel =
    instance.orientation === "reversed" ? "逆位" : "正位";
  const isRevealed = state === "revealed";
  const canReveal = interactive && state === "sealed";
  const promptText =
    state === "igniting" || state === "burning"
      ? "火焰揭示中"
      : interactive
        ? "點擊點燃"
        : roleLabel;

  const finish = useCallback(() => {
    setState("revealed");
    onRevealed(role);
  }, [onRevealed, role]);
  const markBurning = useCallback(() => setState("burning"), []);
  const getSource = useCallback(
    () =>
      bodyRef.current?.querySelector<SVGSVGElement>("[data-card-back-svg]") ??
      null,
    [],
  );

  function reveal(event: MouseEvent<HTMLButtonElement>) {
    if (!canReveal) return;
    if (motionMode === "reduced") {
      finish();
      return;
    }
    setIgnition(ignitionFromPointer(event, bodyRef.current));
    setState("igniting");
  }

  return (
    <div
      className={`drawn-card drawn-card--${role}`}
      data-draw-card={role}
      data-reveal-state={state}
    >
      {role === "jumper" && <span className="drawn-card__badge">跳牌</span>}
      <button
        type="button"
        className="drawn-card__button"
        onClick={reveal}
        aria-disabled={!canReveal}
        aria-label={
          isRevealed
            ? `${roleLabel}：${card.name.zhHant}，${orientationLabel}`
            : `以火焰揭示${roleLabel}`
        }
      >
        <div ref={bodyRef} className="drawn-card__body">
          <div className="drawn-card__face" aria-hidden={!isRevealed}>
            <CardArtwork
              card={card}
              side="face"
              orientation={instance.orientation}
            />
          </div>
          {state !== "burning" && !isRevealed && (
            <div className="drawn-card__back" aria-hidden="true">
              <CardArtwork card={card} side="back" orientation="upright" />
            </div>
          )}
          {state !== "sealed" && motionMode !== "reduced" && (
            <BurnReveal
              getSource={getSource}
              ignition={ignition}
              seed={`${instance.instanceId}:${role}`}
              quality={motionMode === "css" ? "lite" : "full"}
              onReady={markBurning}
              onComplete={finish}
            />
          )}
        </div>
      </button>
      <p className="drawn-card__caption" aria-hidden="true">
        {isRevealed ? (
          <>
            <strong>{card.name.zhHant}</strong>
            <span>{orientationLabel}</span>
          </>
        ) : (
          <span className="drawn-card__prompt">{promptText}</span>
        )}
      </p>
    </div>
  );
}
