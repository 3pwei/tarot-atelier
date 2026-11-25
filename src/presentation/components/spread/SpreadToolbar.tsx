"use client";

import { MAX_SPREAD_POSITIONS } from "@/domain/spread/types";
import { BookFloatButton } from "@/presentation/components/book/BookFloatButton";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";

interface SpreadToolbarProps {
  readonly positionCount: number;
  readonly layoutLocked: boolean;
  /** Arrange mode: positions can be moved and rotated, play is paused. */
  readonly arranging: boolean;
  readonly canToggleArrange: boolean;
  readonly onToggleArrange: () => void;
  readonly onAdd: () => void;
  /** Starting over is allowed except while cards are washing or flying. */
  readonly canClear: boolean;
  readonly onClear: () => void;
}

/**
 * Above the table: Edit on the left and Anew on the right, set as raised
 * lettering like the book's other controls. Arranging adds a position and
 * counts them.
 */
export function SpreadToolbar({
  positionCount,
  layoutLocked,
  arranging,
  canToggleArrange,
  onToggleArrange,
  onAdd,
  canClear,
  onClear,
}: SpreadToolbarProps) {
  const atLimit = positionCount >= MAX_SPREAD_POSITIONS;

  return (
    <div className="spread-toolbar">
      <div className="spread-toolbar__row">
        <BookFloatButton
          className="spread-toolbar__arrange"
          label={arranging ? BOOK_COPY.doneEditingLabel : BOOK_COPY.editLabel}
          pressed={arranging}
          disabled={!canToggleArrange}
          onPress={onToggleArrange}
        >
          <span lang="en">
            {arranging ? BOOK_COPY.doneEditing : BOOK_COPY.edit}
          </span>
        </BookFloatButton>
        {arranging && (
          <>
            <button
              type="button"
              className="ghost-action ghost-action--gold"
              disabled={layoutLocked}
              data-full={atLimit || undefined}
              onClick={onAdd}
            >
              ＋ 新增牌位
            </button>
            <span
              className="spread-toolbar__count"
              data-full={atLimit || undefined}
            >
              {positionCount} / {MAX_SPREAD_POSITIONS} 牌位
            </span>
          </>
        )}

        {/* Starting over is part of play, not of editing. */}
        {!arranging && (
          <BookFloatButton
            className="spread-toolbar__restart"
            label={BOOK_COPY.anewLabel}
            disabled={!canClear}
            onPress={onClear}
          >
            <span lang="en">{BOOK_COPY.anew}</span>
            <RestartIcon />
          </BookFloatButton>
        )}
      </div>
    </div>
  );
}

/** A circular arrow: start this spread over. */
function RestartIcon() {
  return (
    <svg
      className="spread-toolbar__restart-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 3.5v5h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
