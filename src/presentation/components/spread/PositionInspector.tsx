"use client";

import { useId } from "react";
import { countCharacters, isQuestionValid } from "@/domain/spread/spread";
import {
  MAX_QUESTION_LENGTH,
  type SpreadPosition,
  type TablePoint,
} from "@/domain/spread/types";
import { ROTATE_STEP } from "@/presentation/components/spread/PositionSlot";

interface PositionInspectorProps {
  readonly position: SpreadPosition;
  readonly total: number;
  readonly locked: boolean;
  readonly onQuestion: (text: string) => void;
  readonly onRotate: (degrees: number) => void;
  readonly onMove: (point: TablePoint) => void;
  readonly onReorder: (index: number) => void;
  readonly onRemove: () => void;
  readonly onClose: () => void;
}

function toPercent(value: number): number {
  return Math.round(value * 1000) / 10;
}

function parseNumber(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function PositionInspector({
  position,
  total,
  locked,
  onQuestion,
  onRotate,
  onMove,
  onReorder,
  onRemove,
  onClose,
}: PositionInspectorProps) {
  const baseId = useId();
  const questionId = `${baseId}-question`;
  const errorId = `${baseId}-error`;
  const valid = isQuestionValid(position.question);
  const length = countCharacters(position.question.trim());
  const drawn = Boolean(position.drawResult);

  return (
    <section
      className="position-inspector"
      aria-label={`編輯牌位 ${position.index}`}
      data-testid="position-inspector"
    >
      <header className="position-inspector__head">
        <h3>
          <span className="position-inspector__number">{position.index}</span>
          編輯牌位
        </h3>
        <button type="button" className="ghost-action" onClick={onClose}>
          完成
        </button>
      </header>

      <label className="field" htmlFor={questionId}>
        <span>
          這個牌位的問題 <em>必填</em>
        </span>
        <textarea
          id={questionId}
          rows={3}
          value={position.question}
          placeholder="例如：我在工作上需要看見什麼？"
          aria-invalid={!valid}
          aria-describedby={errorId}
          onChange={(event) => onQuestion(event.target.value)}
        />
        <small id={errorId} data-invalid={!valid || undefined}>
          {valid
            ? `${length} / ${MAX_QUESTION_LENGTH} 字`
            : "請輸入 1–300 字的問題，未填寫不能開始抽牌。"}
        </small>
      </label>

      <div className="position-inspector__grid">
        <label className="field">
          <span>排序</span>
          <select
            value={position.index}
            disabled={locked}
            onChange={(event) => onReorder(Number(event.target.value))}
          >
            {Array.from({ length: total }, (_, order) => (
              <option key={order} value={order + 1}>
                第 {order + 1} 號
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>旋轉（度）</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={359}
            step={1}
            value={position.rotation}
            disabled={locked}
            onChange={(event) => {
              const value = parseNumber(event.target.value);
              if (value !== undefined) onRotate(value);
            }}
          />
        </label>

        <label className="field">
          <span>水平位置（0–100）</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={1}
            value={toPercent(position.x)}
            disabled={locked}
            onChange={(event) => {
              const value = parseNumber(event.target.value);
              if (value !== undefined)
                onMove({ x: value / 100, y: position.y });
            }}
          />
        </label>

        <label className="field">
          <span>垂直位置（0–100）</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={1}
            value={toPercent(position.y)}
            disabled={locked}
            onChange={(event) => {
              const value = parseNumber(event.target.value);
              if (value !== undefined)
                onMove({ x: position.x, y: value / 100 });
            }}
          />
        </label>
      </div>

      <div className="position-inspector__actions">
        <button
          type="button"
          className="ghost-action"
          disabled={locked}
          onClick={() => onRotate(position.rotation - ROTATE_STEP)}
        >
          向左轉 {ROTATE_STEP}°
        </button>
        <button
          type="button"
          className="ghost-action"
          disabled={locked}
          onClick={() => onRotate(position.rotation + ROTATE_STEP)}
        >
          向右轉 {ROTATE_STEP}°
        </button>
        <button
          type="button"
          className="danger-action"
          disabled={locked || drawn}
          onClick={onRemove}
        >
          刪除牌位
        </button>
      </div>
      {drawn && (
        <p className="position-inspector__note">
          已有抽牌結果：可移動、旋轉或改問題，但不會重抽，也不能刪除。
        </p>
      )}
    </section>
  );
}
