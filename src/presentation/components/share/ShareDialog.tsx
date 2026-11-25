"use client";

import { useId, useRef } from "react";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type { ReadingRecord } from "@/domain/history/readingHistory";
import { BookFloatButton } from "@/presentation/components/book/BookFloatButton";
import { useModalDialog } from "@/presentation/components/dialog/useModalDialog";
import {
  SharePanel,
  type ShareServices,
} from "@/presentation/components/share/SharePanel";
import { SHARE_COPY } from "@/presentation/components/share/shareLabels";

interface ShareDialogProps {
  readonly record: ReadingRecord;
  readonly registry: DeckRegistry;
  readonly services: ShareServices;
  readonly onClose: () => void;
}

/** Sharing a round, on a sheet of the book's paper laid over the page. */
export function ShareDialog({
  record,
  registry,
  services,
  onClose,
}: ShareDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const modal = useModalDialog(onClose, closeRef);

  return (
    <div
      className="dialog-backdrop share-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="share-dialog paper-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={modal.onKeyDown}
      >
        <header className="share-dialog__head">
          <h2 id={titleId}>{SHARE_COPY.title}</h2>
          <BookFloatButton
            ref={closeRef}
            label={SHARE_COPY.close}
            onPress={onClose}
          >
            {SHARE_COPY.close}
          </BookFloatButton>
        </header>
        <SharePanel record={record} registry={registry} services={services} />
      </div>
    </div>
  );
}
