"use client";

import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { SpreadPosition, TablePoint } from "@/domain/spread/types";

/** Pointer travel before a press becomes a drag instead of a click. */
const DRAG_THRESHOLD_PX = 5;
export const KEY_STEP = 0.01;
export const KEY_STEP_LARGE = 0.05;
export const ROTATE_STEP = 15;

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

interface DragSession {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly offset: TablePoint;
  moved: boolean;
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
  const suppressClick = useRef(false);
  const detach = useRef<() => void>(() => undefined);
  const latest = useRef({ position, onMove });
  useEffect(() => {
    latest.current = { position, onMove };
  });
  useEffect(() => () => detach.current(), []);

  const question = position.question.trim();
  const hasCards = Boolean(position.drawResult);
  const style = {
    "--x": position.x,
    "--y": position.y,
    "--rot": `${position.rotation}deg`,
  } as CSSProperties;

  function relativePoint(clientX: number, clientY: number): TablePoint | null {
    const rect = field.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (locked) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const start = relativePoint(event.clientX, event.clientY);
    if (!start) return;
    detach.current();
    const session: DragSession = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offset: { x: start.x - position.x, y: start.y - position.y },
      moved: false,
    };
    const slot = event.currentTarget;

    const onPointerMove = (move: globalThis.PointerEvent) => {
      if (move.pointerId !== session.pointerId) return;
      if (
        !session.moved &&
        Math.hypot(
          move.clientX - session.startX,
          move.clientY - session.startY,
        ) < DRAG_THRESHOLD_PX
      ) {
        return;
      }
      session.moved = true;
      slot.dataset.dragging = "true";
      const point = relativePoint(move.clientX, move.clientY);
      if (!point) return;
      latest.current.onMove(latest.current.position.id, {
        x: point.x - session.offset.x,
        y: point.y - session.offset.y,
      });
    };
    const onPointerEnd = (end: globalThis.PointerEvent) => {
      if (end.pointerId !== session.pointerId) return;
      suppressClick.current = session.moved;
      // Touch drags end without a click; never swallow the next real tap.
      if (session.moved) {
        setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
      delete slot.dataset.dragging;
      detach.current();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    detach.current = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      detach.current = () => undefined;
    };
  }

  // A drag must not also ignite a card or toggle selection on release.
  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

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
      className="spread-slot"
      style={style}
      data-slot={position.id}
      data-index={position.index}
      data-selected={selected || undefined}
      data-drawn={hasCards || undefined}
      data-missing-question={question.length === 0 || undefined}
      data-locked={locked || undefined}
      onPointerDown={handlePointerDown}
      onClickCapture={handleClickCapture}
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
      <span id={hintId} className="sr-only">
        {`位置：橫向 ${percent(position.x)}、縱向 ${percent(position.y)}（0–100），旋轉 ${position.rotation} 度。`}
        方向鍵或數字鍵盤移動，Shift 加大步幅；[ 與 ] 旋轉；Enter 編輯。
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
