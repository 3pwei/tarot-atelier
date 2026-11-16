"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { clampCoordinate, normalizeRotation } from "@/domain/spread/spread";
import type { SpreadPosition, TablePoint } from "@/domain/spread/types";

/** The result of a gesture, handed to the spread once the pointer lifts. */
export interface SlotGestureResult {
  readonly point?: TablePoint;
  readonly rotation?: number;
}

interface FieldSize {
  readonly width: number;
  readonly height: number;
}

/** The angle readout shown while a position turns, e.g. 「90°」. */
export function angleLabel(degrees: number): string {
  return `${normalizeRotation(degrees)}°`;
}

/** Keeps a previewed point on the table, exactly as the spread will. */
export function clampToTable(point: TablePoint): TablePoint {
  return { x: clampCoordinate(point.x), y: clampCoordinate(point.y) };
}

/**
 * The CSS `translate` that shows a position at `to` while it still sits at
 * `from`. Coordinates are fractions of the field; the field's own size is
 * used, not its zoomed size on screen, because the slot moves inside it.
 */
export function previewTranslate(
  from: TablePoint,
  to: TablePoint,
  field: FieldSize,
): string {
  const x = (to.x - from.x) * field.width;
  const y = (to.y - from.y) * field.height;
  return `${x}px ${y}px`;
}

/**
 * Shows a drag or a turn on the slot itself, without re-rendering the table:
 * every move would otherwise lay out and repaint the whole board. The result
 * is committed once, when the gesture ends; the preview offset is cleared in
 * the same frame the committed position renders, so nothing jumps.
 */
export function useSlotPreview(
  slot: RefObject<HTMLElement | null>,
  field: RefObject<HTMLElement | null>,
) {
  const pending = useRef<SlotGestureResult>({});
  const clearOnRender = useRef(false);

  useLayoutEffect(() => {
    if (!clearOnRender.current) return;
    clearOnRender.current = false;
    slot.current?.style.removeProperty("translate");
  });

  return {
    move(from: SpreadPosition, to: TablePoint) {
      const element = slot.current;
      const box = field.current;
      if (!element || !box) return;
      const point = clampToTable(to);
      pending.current = { ...pending.current, point };
      element.style.setProperty(
        "translate",
        previewTranslate(from, point, {
          width: box.offsetWidth,
          height: box.offsetHeight,
        }),
      );
    },
    turn(degrees: number) {
      const element = slot.current;
      pending.current = { ...pending.current, rotation: degrees };
      element?.style.setProperty("--rot", `${degrees}deg`);
      element
        ?.querySelector<HTMLElement>("[data-angle]")
        ?.setAttribute("data-angle", angleLabel(degrees));
    },
    /** Returns what changed and resets; safe to call more than once. */
    take(current: SpreadPosition): SlotGestureResult {
      const { point, rotation } = pending.current;
      pending.current = {};
      const moved =
        point !== undefined && (point.x !== current.x || point.y !== current.y);
      if (moved) clearOnRender.current = true;
      else slot.current?.style.removeProperty("translate");
      return {
        ...(moved ? { point } : {}),
        ...(rotation !== undefined ? { rotation } : {}),
      };
    },
  };
}
