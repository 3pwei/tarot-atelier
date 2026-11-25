/**
 * A page lifted from its lower outer corner and laid over to the left, as a
 * set of CSS keyframes. The fold is the perpendicular bisector between where
 * the corner rests and where it is now; the corner travels a flattened arc
 * around the bottom of the spine. Only transforms and opacities change, so
 * the browser plays it on the compositor; script computes the geometry once.
 */

/** The layers of a turning leaf, each animated by its own keyframes. */
export const CURL_LAYERS = [
  /** The part still lying flat: a window turned along the fold… */
  "keepWindow",
  /** …and the page inside it, turned back so it stays put. */
  "keepPage",
  /** The part folded over, mirrored: the leaf's back. */
  "flapWindow",
  "flapPage",
  /** Light and shade drawn along the fold, on each part and on the page below. */
  "keepFold",
  "flapFold",
  "underFold",
  "keepShade",
  "flapShade",
  "flapRim",
  "underShade",
] as const;

export type CurlLayer = (typeof CURL_LAYERS)[number];

export interface CurlStyle {
  readonly transform: string;
  readonly opacity?: number;
}

export interface CurlFrame {
  /** 0 to 1 through the turn. */
  readonly offset: number;
  readonly layers: Readonly<Record<CurlLayer, CurlStyle>>;
}

export interface CurlOptions {
  readonly width: number;
  readonly height: number;
  /** How high the corner rises, as a share of the page's width. */
  readonly lift?: number;
  readonly samples?: number;
}

/** A shade's natural width; it is scaled to the fold's reach. */
export const SHADE_WIDTH = 100;
const DEFAULT_LIFT = 0.42;
const DEFAULT_SAMPLES = 24;
/** How far the flat part's shade reaches, as a share of the page's width. */
const KEEP_SHADE_REACH = 0.22;
const UNDER_SHADE_REACH = 0.3;

/**
 * The length of a window's sides: long enough to cover the whole page from
 * any fold, whose middle always lies on the page.
 */
export function curlReach(width: number, height: number): number {
  return Math.ceil(Math.hypot(width, height) * 1.05);
}

/** Eases in and out, so the leaf lifts gently and lands softly. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** The frames of a forward turn; play them reversed to turn back. */
export function curlFrames({
  width,
  height,
  lift = DEFAULT_LIFT,
  samples = DEFAULT_SAMPLES,
}: CurlOptions): readonly CurlFrame[] {
  const reach = curlReach(width, height);
  const frames: CurlFrame[] = [];
  let previousAngle: number | undefined;
  for (let step = 0; step <= samples; step += 1) {
    const offset = step / samples;
    // The very start and end are a hair off flat, so the fold has a direction.
    const phi = Math.PI * clamp(easeInOutCubic(offset), 0.002, 0.998);
    const corner = {
      x: width * Math.cos(phi),
      y: height - width * lift * Math.sin(phi),
    };
    const dx = corner.x - width;
    const dy = corner.y - height;
    let angle = Math.atan2(dy, dx);
    // Keep the angle continuous, so neighbouring frames never spin around.
    if (previousAngle !== undefined) {
      while (angle - previousAngle > Math.PI) angle -= 2 * Math.PI;
      while (previousAngle - angle > Math.PI) angle += 2 * Math.PI;
    }
    previousAngle = angle;
    const half = Math.hypot(dx, dy) / 2;
    const middle = { x: (width + corner.x) / 2, y: (height + corner.y) / 2 };
    // How lifted the leaf is: 0 flat on either side, 1 standing up.
    const lifted =
      Math.sin(Math.acos(clamp(corner.x / width, -1, 1))) *
      Math.min(1, half / (width * 0.08));
    const place = `translate(${px(middle.x)}, ${px(middle.y)}) rotate(${deg(angle)})`;
    const back = `rotate(${deg(-angle)}) translate(${px(-middle.x)}, ${px(-middle.y)})`;
    const windowAt = `${place} translate(0px, ${px(-reach)})`;
    const shade = (scale: number) => `${place} scaleX(${round(scale)})`;
    frames.push({
      offset,
      layers: {
        keepWindow: { transform: windowAt },
        keepPage: { transform: `translate(0px, ${px(reach)}) ${back}` },
        flapWindow: { transform: windowAt },
        flapPage: {
          transform: `translate(0px, ${px(reach)}) scale(-1, 1) ${back}`,
        },
        keepFold: { transform: place },
        flapFold: { transform: `${place} scale(-1, 1)` },
        underFold: { transform: place },
        keepShade: {
          transform: shade(
            Math.min(half * 0.7, width * KEEP_SHADE_REACH) / SHADE_WIDTH,
          ),
          opacity: round(lifted),
        },
        flapShade: {
          transform: shade(half / SHADE_WIDTH),
          opacity: round(lifted),
        },
        flapRim: {
          transform: shade(0.35 + lifted),
          opacity: round(lifted),
        },
        underShade: {
          transform: shade(
            Math.min(half * 0.9, width * UNDER_SHADE_REACH) / SHADE_WIDTH,
          ),
          opacity: round(lifted),
        },
      },
    });
  }
  return frames;
}

/** The keyframes name of one layer of the curl for a page of this size. */
export function curlAnimationName(
  layer: CurlLayer,
  width: number,
  height: number,
): string {
  return `curl-${layer}-${Math.round(width)}x${Math.round(height)}`;
}

/** The CSS for every layer's keyframes, for one size of page. */
export function curlKeyframesCss(
  width: number,
  height: number,
  frames: readonly CurlFrame[],
): string {
  return CURL_LAYERS.map((layer) => {
    const steps = frames
      .map((frame) => {
        const style = frame.layers[layer];
        const opacity =
          style.opacity === undefined ? "" : `;opacity:${style.opacity}`;
        return `${round(frame.offset * 100)}%{transform:${style.transform}${opacity}}`;
      })
      .join("");
    return `@keyframes ${curlAnimationName(layer, width, height)}{${steps}}`;
  }).join("\n");
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function px(value: number): string {
  return `${round(value)}px`;
}

function deg(radians: number): string {
  return `${round((radians * 180) / Math.PI)}deg`;
}
