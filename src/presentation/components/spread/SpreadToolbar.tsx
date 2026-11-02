"use client";

import { useState } from "react";
import { SPREAD_PRESETS } from "@/domain/spread/presets";
import {
  MAX_SPREAD_POSITIONS,
  type SpreadPresetId,
} from "@/domain/spread/types";

interface SpreadToolbarProps {
  readonly presetId: SpreadPresetId;
  readonly positionCount: number;
  readonly presetsLocked: boolean;
  readonly layoutLocked: boolean;
  /** Table zoom factor; shown as ×1.25 rather than a percentage. */
  readonly zoom: number;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly onPreset: (presetId: SpreadPresetId) => void;
  readonly onAdd: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomReset: () => void;
  readonly onClear: () => void;
}

export function SpreadToolbar({
  presetId,
  positionCount,
  presetsLocked,
  layoutLocked,
  zoom,
  canZoomIn,
  canZoomOut,
  onPreset,
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
      <div
        className="spread-toolbar__presets"
        role="group"
        aria-label="牌陣範例"
      >
        {SPREAD_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="preset-chip"
            aria-pressed={preset.id === presetId}
            disabled={presetsLocked || layoutLocked}
            title={preset.description}
            onClick={() => onPreset(preset.id)}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="spread-toolbar__row">
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
      </div>
    </div>
  );
}
