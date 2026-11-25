"use client";

import { useId, useRef } from "react";
import { BookFloatButton } from "@/presentation/components/book/BookFloatButton";
import { useModalDialog } from "@/presentation/components/dialog/useModalDialog";

interface ConfirmDialogProps {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Asks before an action that discards something, on a sheet of the book's
 * paper laid over the page. Cancel has the focus, so Enter or Escape alone
 * never discards.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const modal = useModalDialog(onCancel, cancelRef);

  return (
    <div
      className="dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="confirm-dialog paper-sheet"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onKeyDown={modal.onKeyDown}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={messageId}>{message}</p>
        <div className="confirm-dialog__actions">
          <BookFloatButton ref={cancelRef} label="取消" onPress={onCancel}>
            取消
          </BookFloatButton>
          <BookFloatButton label={confirmLabel} onPress={onConfirm}>
            {confirmLabel}
          </BookFloatButton>
        </div>
      </div>
    </div>
  );
}
