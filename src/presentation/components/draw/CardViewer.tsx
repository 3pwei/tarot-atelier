"use client";

import { useId, useRef } from "react";
import type { CardDefinition, Orientation } from "@/domain/deck/types";
import { CardArtwork } from "@/presentation/components/CardArtwork";
import {
  ORIENTATION_LABELS,
  ROLE_LABELS,
  type CardRole,
} from "@/presentation/components/cards/cardLabels";
import { useModalDialog } from "@/presentation/components/dialog/useModalDialog";

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
  const modal = useModalDialog(onClose, closeRef);

  const orientationLabel = ORIENTATION_LABELS[orientation];

  return (
    <div
      className="dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="card-viewer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={modal.onKeyDown}
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
