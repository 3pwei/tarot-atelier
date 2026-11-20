"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { Sharer } from "@/application/ports/sharer";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type { ReadingRecord } from "@/domain/history/readingHistory";
import {
  shareableRecord,
  type QuestionVisibility,
} from "@/domain/share/shareRecord";
import type { ShareImageRenderer } from "@/presentation/components/share/renderShareImage";
import {
  buildShareCard,
  shareFileName,
  shareText,
  type ShareCard,
} from "@/presentation/components/share/shareCard";
import {
  IMAGE_OUTCOME_MESSAGES,
  SHARE_COPY,
  TEXT_OUTCOME_MESSAGES,
} from "@/presentation/components/share/shareLabels";

export interface ShareServices {
  readonly sharer: Sharer;
  readonly renderImage: ShareImageRenderer;
  /** Where the shared image and text point people to. */
  readonly siteUrl: () => string;
}

interface SharePanelProps {
  readonly record: ReadingRecord;
  readonly registry: DeckRegistry;
  readonly services: ShareServices;
}

type Preview =
  | {
      readonly status: "ready";
      readonly card: ShareCard;
      readonly image: Blob;
      readonly url: string;
    }
  | { readonly status: "failed"; readonly card: ShareCard };

/**
 * Previews the share image and hands it, or the text, to the platform.
 * Questions are shown by default and can be hidden before sharing.
 */
export function SharePanel({ record, registry, services }: SharePanelProps) {
  const hideId = useId();
  const [questions, setQuestions] = useState<QuestionVisibility>("shown");
  const [preview, setPreview] = useState<Preview>();
  const [message, setMessage] = useState<string>();
  const { sharer, renderImage, siteUrl } = services;

  const card = useMemo(
    () =>
      buildShareCard({
        record: shareableRecord(record, questions),
        deck: registry.get(record.deckId),
        siteUrl: siteUrl(),
      }),
    [record, questions, registry, siteUrl],
  );

  useEffect(() => {
    let current = true;
    let url: string | undefined;
    renderImage(card).then(
      (image) => {
        if (!current) return;
        url = URL.createObjectURL(image);
        setPreview({ status: "ready", card, image, url });
      },
      () => {
        if (current) setPreview({ status: "failed", card });
      },
    );
    return () => {
      current = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [card, renderImage]);

  // A preview made for other settings is never shown or shared.
  const shown = preview?.card === card ? preview : undefined;

  const shareImage = async () => {
    if (shown?.status !== "ready") return;
    const outcome = await sharer.shareImage({
      image: shown.image,
      fileName: shareFileName(card.recordedAt),
      title: SHARE_COPY.brand,
      text: shareText(card),
    });
    setMessage(IMAGE_OUTCOME_MESSAGES[outcome]);
  };

  const copyText = async () => {
    setMessage(TEXT_OUTCOME_MESSAGES[await sharer.copyText(shareText(card))]);
  };

  return (
    <div className="share-panel">
      <div className="share-panel__preview" aria-busy={!shown || undefined}>
        {shown?.status === "ready" ? (
          // A generated blob URL; next/image cannot optimise it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown.url} alt={SHARE_COPY.previewAlt} />
        ) : (
          <p role="status">
            {shown?.status === "failed"
              ? SHARE_COPY.previewFailed
              : SHARE_COPY.preparing}
          </p>
        )}
      </div>

      <label className="share-panel__option" htmlFor={hideId}>
        <input
          id={hideId}
          type="checkbox"
          checked={questions === "hidden"}
          onChange={(event) =>
            setQuestions(event.target.checked ? "hidden" : "shown")
          }
        />
        {SHARE_COPY.hideQuestions}
      </label>

      <div className="share-panel__actions">
        <button
          type="button"
          className="reading-generate"
          disabled={shown?.status !== "ready"}
          onClick={() => void shareImage()}
        >
          {SHARE_COPY.shareImage}
        </button>
        <button
          type="button"
          className="ghost-action ghost-action--gold"
          onClick={() => void copyText()}
        >
          {SHARE_COPY.copyText}
        </button>
      </div>
      <p className="share-panel__status" role="status">
        {message}
      </p>
      <p className="share-panel__hint">{SHARE_COPY.fallbackHint}</p>
    </div>
  );
}
