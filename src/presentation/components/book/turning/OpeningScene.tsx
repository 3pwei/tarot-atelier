"use client";

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { BookRect } from "@/presentation/components/book/turning/opening";
import {
  leafVisibility,
  OPENING,
  openingCamera,
  openingMs,
  type OpeningCamera,
} from "@/presentation/components/book/turning/opening";
import { useAnimationsFinished } from "@/presentation/components/book/turning/useAnimationsFinished";
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
  readonly back: string;
  readonly delayMs: number;
  readonly durationMs: number;
}

/** The cover, then the one leaf whose back is the frontispiece. */
const LEAVES: readonly Leaf[] = [
  {
    front: "cover",
    back: "endpaper",
    delayMs: OPENING.coverAtMs,
    durationMs: OPENING.coverMs,
  },
  {
    front: "paper",
    back: "frontispiece",
    delayMs: OPENING.leafAtMs,
    durationMs: OPENING.leafMs,
  },
];

const VISIBLE = leafVisibility(LEAVES);

interface OpeningSceneProps {
  readonly from: BookRect;
  /**
   * Where the live page lies (the right-hand one with facing pages). The
   * real pages are already laid out beneath the scene when it reads this.
   */
  readonly measurePage: () => BookRect | undefined;
  /** A still copy of the contents, for the right-hand page. */
  readonly contents: ReactNode;
  /** A still copy of the frontispiece, on the back of the leaf that turns. */
  readonly frontispiece: ReactNode;
  /** Every part of the scene has played out. */
  readonly onFinished: () => void;
}

/**
 * The book waking up: light leaks from its pages, the cover swings open,
 * one leaf turns and the camera leans in. It ends exactly on the live pages
 * beneath it, which it only covers; the book swaps them in when it ends.
 */
export function OpeningScene({
  from,
  measurePage,
  contents,
  frontispiece,
  onFinished,
}: OpeningSceneProps) {
  const [camera, setCamera] = useState<OpeningCamera>();
  // Read as the scene mounts, before the first paint, once the real pages
  // beneath are laid out: its first frame is already right.
  const measure = useCallback(
    (frame: HTMLDivElement | null) => {
      if (!frame || camera) return;
      const page = measurePage();
      if (!page) {
        onFinished();
        return;
      }
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      setCamera(openingCamera(viewport, from, page));
    },
    [camera, from, measurePage, onFinished],
  );
  return (
    <div ref={measure} className="opening-frame">
      {camera && (
        <OpeningStage
          camera={camera}
          contents={contents}
          frontispiece={frontispiece}
          onFinished={onFinished}
        />
      )}
    </div>
  );
}

interface OpeningStageProps {
  readonly camera: OpeningCamera;
  readonly contents: ReactNode;
  readonly frontispiece: ReactNode;
  readonly onFinished: () => void;
}

function OpeningStage({
  camera,
  contents,
  frontispiece,
  onFinished,
}: OpeningStageProps) {
  const root = useRef<HTMLDivElement>(null);
  useAnimationsFinished(root, openingMs(), onFinished);
  const { closed, book } = camera;
  const base = `${PUBLIC_BASE_PATH}/book`;
  const style = {
    // Where the closed book lay, for the glow and the desk's lean.
    "--opening-closed-left": `${closed.left}px`,
    "--opening-closed-top": `${closed.top}px`,
    "--opening-closed-width": `${closed.width}px`,
    "--opening-closed-height": `${closed.height}px`,
    // The book is laid out where it ends, and starts squeezed onto the closed one.
    "--opening-left": `${book.left}px`,
    "--opening-top": `${book.top}px`,
    "--opening-width": `${book.width}px`,
    "--opening-height": `${book.height}px`,
    "--opening-zoom": camera.zoom,
    "--opening-from-scale-x": camera.fromScaleX,
    "--opening-from-scale-y": camera.fromScaleY,
    "--opening-from-x": `${camera.fromX}px`,
    "--opening-from-y": `${camera.fromY}px`,
    "--opening-desk-scale": camera.deskScale,
    "--opening-origin-x": `${closed.left + closed.width / 2}px`,
    "--opening-origin-y": `${closed.top + closed.height / 2}px`,
    "--opening-camera-at": `${OPENING.cameraAtMs}ms`,
    "--opening-camera-ms": `${OPENING.cameraMs}ms`,
    "--opening-total": `${openingMs()}ms`,
    "--opening-cover": `url("${base}/cover.webp")`,
  } as CSSProperties;

  return (
    <div ref={root} className="opening" style={style} inert aria-hidden="true">
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
            {/* The live contents page, still, where the real one lies. */}
            <div className="opening__face opening__contents">{contents}</div>
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
                  >
                    {leaf.back === "frontispiece" && frontispiece}
                  </div>
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
