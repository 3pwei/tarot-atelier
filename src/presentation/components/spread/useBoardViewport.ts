"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { TablePoint } from "@/domain/spread/types";
import { createFrameCoalescer } from "@/presentation/components/spread/frameCoalescer";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 2.5;
const WHEEL_ZOOM_SENSITIVITY = 0.0025;

export interface BoardView {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

const IDENTITY: BoardView = { scale: 1, x: 0, y: 0 };

/** Keeps the zoomed table covering the viewport: no empty gutters. */
export function clampView(
  view: BoardView,
  width: number,
  height: number,
): BoardView {
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.scale));
  const clampAxis = (offset: number, size: number) =>
    Math.min(0, Math.max(size * (1 - scale), offset));
  return { scale, x: clampAxis(view.x, width), y: clampAxis(view.y, height) };
}

/** Zooms around `origin` (viewport pixels) so that point stays put. */
export function zoomAround(
  view: BoardView,
  nextScale: number,
  origin: TablePoint,
  width: number,
  height: number,
): BoardView {
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale));
  const ratio = scale / view.scale;
  return clampView(
    {
      scale,
      x: origin.x - (origin.x - view.x) * ratio,
      y: origin.y - (origin.y - view.y) * ratio,
    },
    width,
    height,
  );
}

interface Gesture {
  readonly pointers: Map<number, TablePoint>;
  startView: BoardView;
  startDistance: number;
  startCenter: TablePoint;
}

function centerOf(points: readonly TablePoint[]): TablePoint {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function distanceOf(points: readonly TablePoint[]): number {
  const [a, b] = points;
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}

/**
 * Zoom and pan for the spread table. The view is presentation-only: position
 * coordinates are stored relative to the table and never change with it.
 */
export interface GestureOptions {
  /**
   * False while one finger belongs to something else, such as shuffling the
   * deck: a single pointer then leaves the view alone, and two still pinch.
   */
  readonly canPan: boolean;
}

export function useBoardViewport(viewport: RefObject<HTMLElement | null>) {
  const [view, setView] = useState<BoardView>(IDENTITY);
  const gesture = useRef<Gesture | null>(null);
  const panUpdates = useRef(createFrameCoalescer());
  useEffect(() => () => panUpdates.current.cancel(), []);
  const latestView = useRef(view);
  useEffect(() => {
    latestView.current = view;
  }, [view]);

  const size = () => ({
    width: viewport.current?.clientWidth ?? 0,
    height: viewport.current?.clientHeight ?? 0,
  });

  // Trackpad pinches arrive as ctrl+wheel; plain wheel keeps scrolling the page.
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const origin = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      setView((current) =>
        zoomAround(
          current,
          current.scale * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY),
          origin,
          element.clientWidth,
          element.clientHeight,
        ),
      );
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [viewport]);

  // Re-clamp when the viewport resizes (rotation, window resize).
  useEffect(() => {
    const element = viewport.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      setView((current) =>
        clampView(current, element.clientWidth, element.clientHeight),
      ),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [viewport]);

  const localPoint = (event: ReactPointerEvent<HTMLElement>): TablePoint => {
    const rect = viewport.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  };

  /** Background gestures: one pointer pans a zoomed table, two pinch. */
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      event.target instanceof Element &&
      // Positions and the deck handle their own gestures.
      event.target.closest("[data-slot], [data-own-gesture]")
    ) {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const current = gesture.current ?? {
      pointers: new Map<number, TablePoint>(),
      startView: latestView.current,
      startDistance: 0,
      startCenter: { x: 0, y: 0 },
    };
    current.pointers.set(event.pointerId, localPoint(event));
    const points = [...current.pointers.values()];
    current.startView = latestView.current;
    current.startDistance = distanceOf(points);
    current.startCenter = centerOf(points);
    gesture.current = current;
  };

  const pointerMove =
    ({ canPan }: GestureOptions) =>
    (event: ReactPointerEvent<HTMLElement>) => {
      const current = gesture.current;
      if (!current?.pointers.has(event.pointerId)) return;
      current.pointers.set(event.pointerId, localPoint(event));
      const points = [...current.pointers.values()];
      const center = centerOf(points);
      const { width, height } = size();
      const { startView, startCenter } = current;
      const pinching = points.length >= 2 && current.startDistance > 0;
      if (!pinching && (!canPan || startView.scale <= MIN_ZOOM)) return;

      const base = pinching
        ? zoomAround(
            startView,
            startView.scale * (distanceOf(points) / current.startDistance),
            startCenter,
            width,
            height,
          )
        : startView;
      const next = clampView(
        {
          ...base,
          x: base.x + center.x - startCenter.x,
          y: base.y + center.y - startCenter.y,
        },
        width,
        height,
      );
      panUpdates.current.schedule(() => {
        latestView.current = next;
        setView(next);
      });
    };

  const onPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current) return;
    // Re-anchoring below reads the view, so apply the last move first.
    panUpdates.current.flush();
    current.pointers.delete(event.pointerId);
    if (current.pointers.size === 0) {
      gesture.current = null;
      return;
    }
    // Re-anchor so lifting one finger of a pinch does not jump.
    const points = [...current.pointers.values()];
    current.startView = latestView.current;
    current.startDistance = distanceOf(points);
    current.startCenter = centerOf(points);
  };

  return {
    view,
    /** Handlers for the table's background, under the given options. */
    gestureHandlers: (options: GestureOptions) => ({
      onPointerDown,
      onPointerMove: pointerMove(options),
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    }),
  };
}
