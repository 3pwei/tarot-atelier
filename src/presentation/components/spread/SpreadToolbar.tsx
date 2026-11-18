"use client";

import { MAX_SPREAD_POSITIONS } from "@/domain/spread/types";

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
        <button
          type="button"
          className="ghost-action ghost-action--gold spread-toolbar__arrange"
          aria-pressed={arranging}
          disabled={!canToggleArrange}
          onClick={onToggleArrange}
        >
          {arranging ? "結束編輯" : "編輯牌陣"}
        </button>
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

        {/* Starting over is part of play, not of editing the layout. */}
        {!arranging && (
          <button
            type="button"
            className="icon-action spread-toolbar__restart"
            aria-label="清除本次牌陣"
            title="清除本次牌陣"
            disabled={!canClear}
            onClick={onClear}
          >
            <RestartIcon />
          </button>
        )}
      </div>
    </div>
  );
}

/** A circular arrow: start this spread over. */
function RestartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
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
