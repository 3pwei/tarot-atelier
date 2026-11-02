"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import type { SpreadPosition, TablePoint } from "@/domain/spread/types";
import {
  distanceFrom,
  LONG_PRESS_MS,
  MIN_ROTATE_RADIUS_PX,
  pointerAngle,
  rotationFromDrag,
} from "@/presentation/components/spread/rotationGesture";

/** Pointer travel before a press becomes a drag instead of a click. */
const DRAG_THRESHOLD_PX = 5;
/** A short buzz confirms the switch to rotating where devices support it. */
const LONG_PRESS_VIBRATION_MS = 12;

type Mode = "pending" | "move" | "rotate";

interface Session {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly offset: TablePoint;
  mode: Mode;
  lastX: number;
  lastY: number;
  /** Set once the pointer is far enough from the centre to read an angle. */
  startAngle?: number;
  startRotation: number;
  center?: TablePoint;
  /** Started on the turning-arrow handle rather than the card. */
  fromHandle: boolean;
  turned: boolean;
}

interface SlotGestureOptions {
  readonly position: SpreadPosition;
  readonly locked: boolean;
  readonly field: RefObject<HTMLElement | null>;
  readonly slot: RefObject<HTMLElement | null>;
  readonly onMove: (positionId: string, point: TablePoint) => void;
  readonly onRotate: (positionId: string, degrees: number) => void;
  /** A tap on the handle without turning it. */
  readonly onHandleTap: () => void;
}

/**
 * Pointer and touch gestures for one position:
 * - press and drag moves it;
 * - press and hold, then drag, rotates it around its centre;
 * - dragging the turning-arrow handle rotates it straight away.
 * A finished gesture never also ignites a card or toggles the selection.
 */
export function useSlotGestures({
  position,
  locked,
  field,
  slot,
  onMove,
  onRotate,
  onHandleTap,
}: SlotGestureOptions) {
  const [rotating, setRotating] = useState(false);
  const suppressClick = useRef(false);
  const detach = useRef<() => void>(() => undefined);
  const latest = useRef({ position, onMove, onRotate, onHandleTap });
  useEffect(() => {
    latest.current = { position, onMove, onRotate, onHandleTap };
  });
  useEffect(() => () => detach.current(), []);

  function relativePoint(clientX: number, clientY: number): TablePoint | null {
    const rect = field.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  function slotCenter(): TablePoint | undefined {
    const rect = slot.current?.getBoundingClientRect();
    return rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : undefined;
  }

  function enterRotate(session: Session) {
    session.mode = "rotate";
    session.center = slotCenter();
    session.startRotation = latest.current.position.rotation;
    // Measure from where the finger is now, so the first move already turns.
    const here = { x: session.lastX, y: session.lastY };
    if (
      session.center &&
      distanceFrom(session.center, here) >= MIN_ROTATE_RADIUS_PX
    ) {
      session.startAngle = pointerAngle(session.center, here);
    }
    setRotating(true);
    try {
      navigator.vibrate?.(LONG_PRESS_VIBRATION_MS);
    } catch {
      // Vibration is a nicety; some browsers refuse it.
    }
  }

  function turn(session: Session, x: number, y: number) {
    const center = session.center;
    if (!center || distanceFrom(center, { x, y }) < MIN_ROTATE_RADIUS_PX) {
      return;
    }
    const angle = pointerAngle(center, { x, y });
    if (session.startAngle === undefined) {
      session.startAngle = angle;
      return;
    }
    session.turned = true;
    latest.current.onRotate(
      latest.current.position.id,
      rotationFromDrag(session.startRotation, session.startAngle, angle),
    );
  }

  function start(event: PointerEvent<HTMLElement>, fromHandle: boolean) {
    if (locked) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const point = relativePoint(event.clientX, event.clientY);
    if (!point) return;
    detach.current();

    const session: Session = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offset: { x: point.x - position.x, y: point.y - position.y },
      mode: "pending",
      lastX: event.clientX,
      lastY: event.clientY,
      startRotation: position.rotation,
      fromHandle,
      turned: false,
    };
    const element = slot.current;
    if (fromHandle) enterRotate(session);
    const timer = fromHandle
      ? undefined
      : setTimeout(() => {
          if (session.mode === "pending") enterRotate(session);
        }, LONG_PRESS_MS);

    const onPointerMove = (move: globalThis.PointerEvent) => {
      if (move.pointerId !== session.pointerId) return;
      session.lastX = move.clientX;
      session.lastY = move.clientY;
      if (session.mode === "rotate") {
        turn(session, move.clientX, move.clientY);
        return;
      }
      if (
        session.mode === "pending" &&
        Math.hypot(
          move.clientX - session.startX,
          move.clientY - session.startY,
        ) < DRAG_THRESHOLD_PX
      ) {
        return;
      }
      if (timer) clearTimeout(timer);
      session.mode = "move";
      if (element) element.dataset.dragging = "true";
      const next = relativePoint(move.clientX, move.clientY);
      if (!next) return;
      latest.current.onMove(latest.current.position.id, {
        x: next.x - session.offset.x,
        y: next.y - session.offset.y,
      });
    };

    const onPointerEnd = (end: globalThis.PointerEvent) => {
      if (end.pointerId !== session.pointerId) return;
      if (timer) clearTimeout(timer);
      const gestured = session.mode !== "pending";
      if (session.fromHandle && !session.turned && end.type === "pointerup") {
        latest.current.onHandleTap();
      }
      suppressClick.current = gestured;
      // Touch gestures end without a click; never swallow the next real tap.
      if (gestured) {
        setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
      if (element) delete element.dataset.dragging;
      setRotating(false);
      detach.current();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    detach.current = () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      detach.current = () => undefined;
    };
  }

  return {
    rotating,
    onSlotPointerDown: (event: PointerEvent<HTMLElement>) =>
      start(event, false),
    onHandlePointerDown: (event: PointerEvent<HTMLElement>) => {
      // The handle's own gesture must not also start a move on the slot.
      event.stopPropagation();
      start(event, true);
    },
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
