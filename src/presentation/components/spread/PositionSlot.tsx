"use client";

import {
  useId,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { SpreadPosition, TablePoint } from "@/domain/spread/types";
import { useSlotGestures } from "@/presentation/components/spread/useSlotGestures";

export const KEY_STEP = 0.01;
export const KEY_STEP_LARGE = 0.05;
/** `[` and `]` fine-tune; a tap on a rotate button turns a bigger step. */
export const ROTATE_STEP = 15;
export const ROTATE_BUTTON_STEP = 45;

/** Arrow keys and the numeric keypad (with or without Num Lock). */
const KEY_DIRECTIONS: Readonly<Record<string, TablePoint>> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  Numpad8: { x: 0, y: -1 },
  Numpad2: { x: 0, y: 1 },
  Numpad4: { x: -1, y: 0 },
  Numpad6: { x: 1, y: 0 },
  Numpad7: { x: -1, y: -1 },
  Numpad9: { x: 1, y: -1 },
  Numpad1: { x: -1, y: 1 },
  Numpad3: { x: 1, y: 1 },
};

export function keyDirection(
  event: Pick<KeyboardEvent, "key" | "code">,
): TablePoint | undefined {
  return KEY_DIRECTIONS[event.code] ?? KEY_DIRECTIONS[event.key];
}

interface PositionSlotProps {
  readonly position: SpreadPosition;
  readonly selected: boolean;
  /** Layout is frozen while the deck shuffles or a card is in flight. */
  readonly locked: boolean;
  readonly field: RefObject<HTMLElement | null>;
  readonly onSelect: (positionId: string) => void;
  readonly onMove: (positionId: string, point: TablePoint) => void;
  readonly onNudge: (positionId: string, delta: TablePoint) => void;
  readonly onRotate: (positionId: string, degrees: number) => void;
  readonly children?: ReactNode;
}

/** A clockwise turning arrow, drawn to read at small sizes. */
export function RotateIcon({
  direction = "clockwise",
}: {
  readonly direction?: "clockwise" | "counterclockwise";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      style={
        direction === "counterclockwise"
          ? { transform: "scaleX(-1)" }
          : undefined
      }
    >
      <path
        d="M19 12a7 7 0 1 1-2.05-4.95"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M20.5 3.5v5.5H15z" fill="currentColor" />
    </svg>
  );
}

function percent(value: number): number {
  return Math.round(value * 100);
}

export function PositionSlot({
  position,
  selected,
  locked,
  field,
  onSelect,
  onMove,
  onNudge,
  onRotate,
  children,
}: PositionSlotProps) {
  const hintId = useId();
  const slotRef = useRef<HTMLDivElement>(null);
  const turnByStep = () =>
    onRotate(position.id, position.rotation + ROTATE_BUTTON_STEP);
  const gestures = useSlotGestures({
    position,
    locked,
    field,
    slot: slotRef,
    onMove,
    onRotate,
    onHandleTap: turnByStep,
  });

  const question = position.question.trim();
  const hasCards = Boolean(position.drawResult);
  const style = {
    "--x": position.x,
    "--y": position.y,
    "--rot": `${position.rotation}deg`,
  } as CSSProperties;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (locked) return;
    const direction = keyDirection(event);
    if (direction) {
      event.preventDefault();
      const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
      onNudge(position.id, { x: direction.x * step, y: direction.y * step });
      return;
    }
    if (event.key === "[" || event.key === "]") {
      event.preventDefault();
      const delta = event.key === "[" ? -ROTATE_STEP : ROTATE_STEP;
      onRotate(position.id, position.rotation + delta);
    }
  }

  return (
    <div
      ref={slotRef}
      className="spread-slot"
      style={style}
      data-slot={position.id}
      data-index={position.index}
      data-selected={selected || undefined}
      data-drawn={hasCards || undefined}
      data-missing-question={question.length === 0 || undefined}
      data-locked={locked || undefined}
      data-rotating={gestures.rotating || undefined}
      onPointerDown={gestures.onSlotPointerDown}
      onClickCapture={gestures.onClickCapture}
      // Holding still to rotate must not open the touch context menu.
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => onSelect(position.id)}
      title={question || undefined}
    >
      <button
        type="button"
        className="spread-slot__handle"
        aria-pressed={selected}
        aria-describedby={hintId}
        aria-label={`牌位 ${position.index}：${question || "尚未設定問題"}`}
        onKeyDown={handleKeyDown}
      >
        {position.index}
      </button>
      {(selected || gestures.rotating) && !locked && (
        <button
          type="button"
          className="spread-slot__rotate"
          aria-label={`牌位 ${position.index} 順時針轉 ${ROTATE_BUTTON_STEP}°`}
          title={`拖曳旋轉，點一下轉 ${ROTATE_BUTTON_STEP}°`}
          onPointerDown={gestures.onHandlePointerDown}
          onClick={(event) => {
            event.stopPropagation();
            // Pointer taps are handled by the gesture; this is the keyboard.
            if (event.detail === 0) turnByStep();
          }}
        >
          <RotateIcon />
        </button>
      )}
      {gestures.rotating && (
        <span className="spread-slot__angle" aria-hidden="true">
          {position.rotation}°
        </span>
      )}
      <span id={hintId} className="sr-only">
        {`位置：橫向 ${percent(position.x)}、縱向 ${percent(position.y)}（0–100），旋轉 ${position.rotation} 度。`}
        方向鍵或數字鍵盤移動，Shift 加大步幅；[ 與 ] 旋轉；Enter
        編輯。觸控或滑鼠：拖曳移動，長按後拖曳旋轉。
      </span>
      {hasCards ? (
        <div className="spread-slot__cards">{children}</div>
      ) : (
        <div className="spread-slot__frame" aria-hidden="true">
          <span>{question ? "✦" : "?"}</span>
        </div>
      )}
    </div>
  );
}
