"use client";

import { useState, type CSSProperties } from "react";
import type { BookRect } from "@/presentation/components/book/turning/opening";
import { BOOK_COPY } from "@/presentation/components/book/bookCopy";
import {
  finalBookRect,
  leafVisibility,
  OPENING,
  openingCamera,
  openingMs,
  type OpeningCamera,
} from "@/presentation/components/book/turning/opening";
import { PUBLIC_BASE_PATH } from "@/shared/config/publicBasePath";

/** Motes of light drifting up out of the pages, placed once. */
const MOTES = Array.from({ length: 16 }, (_, index) => {
  const at = (salt: number) =>
    Math.abs((Math.sin(index * 12.9898 + salt) * 43758.5453) % 1);
  return {
    x: `${40 + at(1) * 70}%`,
    y: `${10 + at(2) * 80}%`,
    size: `${4 + at(3) * 7}px`,
    driftX: `${(at(4) - 0.3) * 120}px`,
    driftY: `${-60 - at(5) * 140}px`,
    delay: `${Math.round(100 + at(6) * 900)}ms`,
  };
});

interface Leaf {
  readonly front: string;
  /** A blank sheet is paper on both sides: one face, seen from either. */
  readonly back?: string;
  readonly delayMs: number;
  readonly durationMs: number;
}

/** The cover, the blank leaves, then the leaf whose back is the frontispiece. */
const LEAVES: readonly Leaf[] = [
  {
    front: "cover",
    back: "endpaper",
    delayMs: OPENING.coverAtMs,
    durationMs: OPENING.coverMs,
  },
  ...Array.from({ length: OPENING.sheets }, (_, index) => ({
    front: "paper",
    delayMs: OPENING.riffleAtMs + index * OPENING.sheetGapMs,
    durationMs: OPENING.sheetMs,
  })),
  {
    front: "paper",
    back: "frontispiece",
    delayMs: OPENING.riffleAtMs + OPENING.sheets * OPENING.sheetGapMs,
    durationMs: OPENING.lastSheetMs,
  },
];

const VISIBLE = leafVisibility(LEAVES);

/**
 * The book waking up: light leaks from its pages, the cover swings open,
 * leaves riffle past and the camera leans in. It only plays; the book swaps
 * in the real pages when it ends.
 */
export function OpeningScene({ from }: { readonly from: BookRect }) {
  // Measured once: the scene lasts two seconds and never re-lays itself out.
  const [{ camera, book }] = useState<{
    readonly camera: OpeningCamera;
    readonly book: BookRect;
  }>(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const opening = openingCamera(viewport, from);
    return { camera: opening, book: finalBookRect(opening, viewport) };
  });
  const base = `${PUBLIC_BASE_PATH}/book`;
  const style = {
    // Where the closed book lay, for the glow and the desk's lean.
    "--opening-closed-left": `${camera.bookLeft}px`,
    "--opening-closed-top": `${camera.bookTop}px`,
    "--opening-closed-width": `${camera.bookWidth}px`,
    "--opening-closed-height": `${camera.bookHeight}px`,
    // The book is laid out where it ends, and starts scaled down onto the closed one.
    "--opening-left": `${book.left}px`,
    "--opening-top": `${book.top}px`,
    "--opening-width": `${book.width}px`,
    "--opening-height": `${book.height}px`,
    "--opening-zoom": camera.scale,
    "--opening-from-scale": 1 / camera.scale,
    "--opening-from-x": `${-camera.shiftX}px`,
    "--opening-from-y": `${-camera.shiftY}px`,
    "--opening-desk-scale": camera.deskScale,
    "--opening-origin-x": `${camera.bookLeft + camera.bookWidth / 2}px`,
    "--opening-origin-y": `${camera.bookTop + camera.bookHeight / 2}px`,
    "--opening-camera-at": `${OPENING.cameraAtMs}ms`,
    "--opening-camera-ms": `${OPENING.cameraMs}ms`,
    "--opening-total": `${openingMs()}ms`,
    "--opening-cover": `url("${base}/cover.webp")`,
    "--opening-plate": `url("${base}/frontispiece.webp")`,
  } as CSSProperties;

  return (
    <div className="opening" style={style} inert aria-hidden="true">
      <div className="opening__desk" />
      {/* The glow stays where the book lay; it fades before the camera moves far. */}
      <div className="opening__glow">
        <div className="opening__halo" />
        <div className="opening__rays" />
      </div>
      <div className="opening__camera">
        <div className="opening__book">
          <div className="opening__shadow" />
          <div className="opening__rim" />
          <div className="opening__block" />
          <div className="opening__left">
            <div className="opening__left-shadow" />
            <div className="opening__left-block" />
          </div>
          <div className="opening__3d">
            <div className="opening__face opening__face--paper opening__contents">
              <span lang="en">{BOOK_COPY.contentsTitle}</span>
            </div>
            {[...LEAVES].reverse().map((leaf, reversedIndex) => {
              const index = LEAVES.length - 1 - reversedIndex;
              return (
                <div
                  key={index}
                  className="opening__leaf"
                  style={
                    {
                      "--leaf-delay": `${leaf.delayMs}ms`,
                      "--leaf-ms": `${leaf.durationMs}ms`,
                      "--z-right": `${(LEAVES.length - index) * 0.6}px`,
                      "--z-left": `${(index + 1) * 0.6}px`,
                      ...visibilityStyle(index),
                    } as CSSProperties
                  }
                >
                  <div
                    className={`opening__face opening__face--${leaf.front}`}
                  />
                  <div
                    className={`opening__face opening__face--back opening__face--${leaf.back}`}
                  />
                </div>
              );
            })}
            <div className="opening__flood" />
            <div className="opening__gutter" />
          </div>
          {MOTES.map((mote, index) => (
            <span
              key={index}
              className="opening__mote"
              style={
                {
                  "--x": mote.x,
                  "--y": mote.y,
                  "--size": mote.size,
                  "--drift-x": mote.driftX,
                  "--drift-y": mote.driftY,
                  "--delay": mote.delay,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** A leaf is drawn only while it can be seen; see `leafVisibility`. */
function visibilityStyle(index: number): CSSProperties {
  const { showAtMs, hideAtMs } = VISIBLE[index]!;
  return {
    "--leaf-show-at": `${showAtMs}ms`,
    "--leaf-show-ms":
      hideAtMs === undefined ? "60s" : `${hideAtMs - showAtMs}ms`,
  } as CSSProperties;
}
