"use client";

import { useState } from "react";
import { MAX_SPREAD_POSITIONS } from "@/domain/spread/types";

interface SpreadToolbarProps {
  readonly positionCount: number;
  readonly layoutLocked: boolean;
  /** Arrange mode: positions can be moved and rotated, play is paused. */
  readonly arranging: boolean;
  readonly canToggleArrange: boolean;
  readonly onToggleArrange: () => void;
  /** Table zoom factor; shown as ×1.25 rather than a percentage. */
  readonly zoom: number;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly onAdd: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomReset: () => void;
  readonly onClear: () => void;
}

export function SpreadToolbar({
  positionCount,
  layoutLocked,
  arranging,
  canToggleArrange,
  onToggleArrange,
  zoom,
  canZoomIn,
  canZoomOut,
  onAdd,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onClear,
}: SpreadToolbarProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const atLimit = positionCount >= MAX_SPREAD_POSITIONS;
  const zoomLabel = `×${Number(zoom.toFixed(2))}`;

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
          {arranging ? "完成編輯" : "編輯牌陣"}
        </button>
        <div
          className="spread-toolbar__zoom"
          role="group"
          aria-label="牌桌縮放"
        >
          <button
            type="button"
            className="icon-action"
            aria-label="縮小牌桌"
            disabled={!canZoomOut}
            onClick={onZoomOut}
          >
            −
          </button>
          <button
            type="button"
            className="icon-action icon-action--wide"
            aria-label={`縮放 ${Number(zoom.toFixed(2))} 倍，按下重設`}
            onClick={onZoomReset}
          >
            {zoomLabel}
          </button>
          <button
            type="button"
            className="icon-action"
            aria-label="放大牌桌"
            disabled={!canZoomIn}
            onClick={onZoomIn}
          >
            ＋
          </button>
        </div>

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
          <>
            {confirmingClear ? (
              <div
                className="spread-toolbar__confirm"
                role="group"
                aria-label="確認清除"
              >
                <span>會移除所有牌位、問題與抽牌結果。</span>
                <button
                  type="button"
                  className="danger-action"
                  onClick={() => {
                    setConfirmingClear(false);
                    onClear();
                  }}
                >
                  確定清除
                </button>
                <button
                  type="button"
                  className="ghost-action"
                  onClick={() => setConfirmingClear(false)}
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="ghost-action"
                disabled={layoutLocked}
                onClick={() => setConfirmingClear(true)}
              >
                清除本次牌陣
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
