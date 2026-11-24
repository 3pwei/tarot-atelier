"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  curlAnimationName,
  curlFrames,
  curlKeyframesCss,
  curlReach,
  type CurlLayer,
} from "@/presentation/components/book/turning/curl";
import {
  reversedTimeline,
  riffleTimeline,
  SINGLE_TURN_MS,
  type SheetTiming,
} from "@/presentation/components/book/turning/timing";
import type { TurnDirection } from "@/presentation/components/book/turning/turnPlan";

export interface LeafBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface PageTurnProps {
  readonly kind: "single" | "riffle";
  readonly direction: TurnDirection;
  /** Where the turning leaf lies, over the page it uncovers or covers. */
  readonly box: LeafBox;
  /** The leaf's printed side: the page leaving, or the one arriving. */
  readonly face: ReactNode;
}

/** Keyframes for each page size, computed once and reused by every turn. */
const CURL_CSS = new Map<string, string>();

export function curlCss(width: number, height: number): string {
  const key = `${Math.round(width)}x${Math.round(height)}`;
  let css = CURL_CSS.get(key);
  if (!css) {
    css = curlKeyframesCss(width, height, curlFrames({ width, height }));
    CURL_CSS.set(key, css);
  }
  return css;
}

/**
 * One leaf turning over the page beneath, and for a riffle the blank sheets
 * that stand in for the pages in between. Purely decorative: the real pages
 * are underneath, so the overlay is inert and hidden from assistive tech.
 */
export function PageTurn({ kind, direction, box, face }: PageTurnProps) {
  const { width, height } = box;
  const reach = curlReach(width, height);
  const forward = riffleTimeline();
  const timeline =
    direction === "forward" ? forward : reversedTimeline(forward);
  const leaf: SheetTiming =
    kind === "single"
      ? { delayMs: 0, durationMs: SINGLE_TURN_MS }
      : timeline.leaf;

  const curl = (layer: CurlLayer): CSSProperties => ({
    animationName: curlAnimationName(layer, width, height),
    animationDuration: `${leaf.durationMs}ms`,
    animationDelay: `${leaf.delayMs}ms`,
    animationDirection: direction === "forward" ? "normal" : "reverse",
    // The frames are already eased; play them evenly and hold both ends.
    animationTimingFunction: "linear",
    animationFillMode: "both",
  });
  const windowSize = { width: reach, height: reach * 2 };
  const pageSize = { width, height };

  return (
    <div
      className="page-turn"
      inert
      aria-hidden="true"
      data-direction={direction}
      style={{ ...box, "--curl-reach": `${reach}px` } as CSSProperties}
    >
      <div className="page-turn__under">
        <div className="page-turn__fold" style={curl("underFold")}>
          <div
            className="page-turn__shade page-turn__shade--under"
            style={curl("underShade")}
          />
        </div>
      </div>
      {kind === "riffle" && (
        <div className="page-turn__sheets">
          <div className="page-turn__sheets-3d">
            {timeline.sheets.map((sheet, index) => (
              <div
                key={index}
                className="page-turn__sheet"
                data-direction={direction}
                style={
                  {
                    "--sheet-delay": `${sheet.delayMs}ms`,
                    "--sheet-ms": `${sheet.durationMs}ms`,
                    // Resting on the right the first is highest; on the left the last.
                    "--z-right": `${(timeline.sheets.length - index) * 0.6}px`,
                    "--z-left": `${(index + 1) * 0.6}px`,
                  } as CSSProperties
                }
              >
                <i />
              </div>
            ))}
          </div>
        </div>
      )}
      <div
        className="page-turn__window"
        style={{ ...windowSize, ...curl("keepWindow") }}
      >
        <div
          className="page-turn__page"
          style={{ ...pageSize, ...curl("keepPage") }}
        >
          {face}
          <div className="page-turn__fold" style={curl("keepFold")}>
            <div
              className="page-turn__shade page-turn__shade--keep"
              style={curl("keepShade")}
            />
          </div>
        </div>
      </div>
      <div
        className="page-turn__window"
        style={{ ...windowSize, ...curl("flapWindow") }}
      >
        <div
          className="page-turn__page"
          style={{ ...pageSize, ...curl("flapPage") }}
        >
          {face}
          {/* The back of a leaf: the front's ink shows through, faint and mirrored. */}
          <div className="page-turn__verso" />
          <div className="page-turn__fold" style={curl("flapFold")}>
            <div
              className="page-turn__shade page-turn__shade--flap"
              style={curl("flapShade")}
            />
            <div className="page-turn__rim" style={curl("flapRim")} />
          </div>
        </div>
      </div>
    </div>
  );
}
