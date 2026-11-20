"use client";

import { useId, useRef } from "react";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type { ReadingRecord } from "@/domain/history/readingHistory";
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

/** Sharing the round on the table, as a sheet over it. */
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
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={modal.onKeyDown}
      >
        <header className="share-dialog__head">
          <h2 id={titleId}>{SHARE_COPY.title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="ghost-action"
            onClick={onClose}
          >
            {SHARE_COPY.close}
          </button>
        </header>
        <SharePanel record={record} registry={registry} services={services} />
      </div>
    </div>
  );
}
