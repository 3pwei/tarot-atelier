"use client";

import { useEffect, useId, useRef } from "react";
import type { CardDefinition, Orientation } from "@/domain/deck/types";
import { CardArtwork } from "@/presentation/components/CardArtwork";
import type { CardRole } from "@/presentation/components/draw/DrawnCard";

const ROLE_LABELS: Readonly<Record<CardRole, string>> = {
  primary: "主牌",
  jumper: "跳牌",
};

interface CardViewerProps {
  readonly card: CardDefinition;
  readonly orientation: Orientation;
  readonly role: CardRole;
  readonly positionIndex: number;
  readonly question: string;
  readonly onClose: () => void;
}

/**
 * A revealed card shown large, with its name, orientation and the question
 * of its position. Escape, the close button or a tap outside closes it, and
 * focus returns to the card that opened it.
 */
export function CardViewer({
  card,
  orientation,
  role,
  positionIndex,
  question,
  onClose,
}: CardViewerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const latestClose = useRef(onClose);
  useEffect(() => {
    latestClose.current = onClose;
  });

  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        latestClose.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, []);

  const orientationLabel = orientation === "reversed" ? "逆位" : "正位";

  return (
    <div
      className="card-viewer"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="card-viewer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // The close button is the only control, so Tab stays inside.
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            closeRef.current?.focus();
          }
        }}
      >
        <button
          ref={closeRef}
          type="button"
          className="card-viewer__close"
          aria-label="關閉放大檢視"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="card-viewer__card">
          <CardArtwork card={card} side="face" orientation={orientation} />
        </div>
        <div className="card-viewer__text">
          <p className="card-viewer__position">
            牌位 {positionIndex} · {ROLE_LABELS[role]}
          </p>
          <h2 id={titleId}>
            {card.name.zhHant}
            <span>{orientationLabel}</span>
          </h2>
          {question.trim() && (
            <p className="card-viewer__question">{question}</p>
          )}
        </div>
      </div>
    </div>
  );
}
