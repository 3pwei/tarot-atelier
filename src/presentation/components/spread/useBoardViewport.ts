"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { TablePoint } from "@/domain/spread/types";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 2.5;
export const ZOOM_STEP = 1.25;
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
export function useBoardViewport(viewport: RefObject<HTMLElement | null>) {
  const [view, setView] = useState<BoardView>(IDENTITY);
  const gesture = useRef<Gesture | null>(null);
  const latestView = useRef(view);
  useEffect(() => {
    latestView.current = view;
  }, [view]);

  const size = () => ({
    width: viewport.current?.clientWidth ?? 0,
    height: viewport.current?.clientHeight ?? 0,
  });

  const zoomTo = (scale: number) => {
    const { width, height } = size();
    setView((current) =>
      zoomAround(
        current,
        scale,
        { x: width / 2, y: height / 2 },
        width,
        height,
      ),
    );
  };

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
      event.target.closest("[data-slot]")
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

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current?.pointers.has(event.pointerId)) return;
    current.pointers.set(event.pointerId, localPoint(event));
    const points = [...current.pointers.values()];
    const center = centerOf(points);
    const { width, height } = size();
    const { startView, startCenter } = current;
    const pinching = points.length >= 2 && current.startDistance > 0;
    if (!pinching && startView.scale <= MIN_ZOOM) return;

    const base = pinching
      ? zoomAround(
          startView,
          startView.scale * (distanceOf(points) / current.startDistance),
          startCenter,
          width,
          height,
        )
      : startView;
    setView(
      clampView(
        {
          ...base,
          x: base.x + center.x - startCenter.x,
          y: base.y + center.y - startCenter.y,
        },
        width,
        height,
      ),
    );
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current) return;
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
    zoomIn: () => zoomTo(view.scale * ZOOM_STEP),
    zoomOut: () => zoomTo(view.scale / ZOOM_STEP),
    reset: () => setView(IDENTITY),
    canZoomIn: view.scale < MAX_ZOOM - 1e-3,
    canZoomOut: view.scale > MIN_ZOOM + 1e-3,
    gestureHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
