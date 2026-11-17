import type { CSSProperties } from "react";

/**
 * One source of truth for shuffle and pick timing. CSS keyframes run the
 * motion on the compositor, so it stays smooth on slow phones; these values
 * reach the stylesheet as custom properties and the dealer waits on them.
 */
/** A tap still washes the cards this long; holding the deck keeps going. */
export const WASH_ROUND_MS = 1600;
/** The washed cards sweep back into one pile in the middle of the table. */
export const GATHER_MS = 350;
/** Time for a chosen card to fly from the wheel to its position. */
export const FLIGHT_MS = 900;
/** The jumper follows the chosen card this long after it. */
export const JUMPER_DELAY_MS = 420;

/** What happens after the person lets go of the deck. */
export interface WashFinish {
  /** The cards keep washing this long: a quick tap still gets a full round. */
  readonly washMs: number;
  /** Then they gather into one pile. */
  readonly gatherMs: number;
}

export function washAfterRelease(heldMs: number): WashFinish {
  return {
    washMs: Math.max(0, WASH_ROUND_MS - Math.max(0, heldMs)),
    gatherMs: GATHER_MS,
  };
}

/** When a chosen card, or the jumper that slipped out with it, has landed. */
export function landingDelayMs(role: FlightRole): number {
  return role === "jumper" ? JUMPER_DELAY_MS + FLIGHT_MS : FLIGHT_MS;
}

/** Timing custom properties for the element that hosts the table. */
export function motionTimingStyle(): CSSProperties {
  return {
    "--gather-duration": `${GATHER_MS}ms`,
    "--flight-duration": `${FLIGHT_MS}ms`,
    "--jumper-delay": `${JUMPER_DELAY_MS}ms`,
  } as CSSProperties;
}

/**
 * The landing slot's frame on screen. Cards inside a rotated position on a
 * zoomed table move in that slot's local coordinates.
 */
export interface FlightFrame {
  /** Slot rotation in degrees. */
  readonly rotation: number;
  /** Table zoom factor. */
  readonly scale: number;
}

export interface ScreenBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export type FlightRole = "primary" | "jumper";

/** Where a card starts and how it arcs, in its slot's local frame. */
export interface FlightPath {
  readonly start: { readonly x: number; readonly y: number };
  readonly peak: { readonly x: number; readonly y: number };
  readonly startScale: number;
  readonly startRotation: number;
}

/** Converts a screen-space offset into the slot's local (unrotated, unzoomed) space. */
export function toLocalOffset(
  dx: number,
  dy: number,
  frame: FlightFrame,
): { readonly x: number; readonly y: number } {
  const radians = (-frame.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const scale = Math.max(frame.scale, 1e-6);
  return {
    x: (dx * cos - dy * sin) / scale,
    y: (dx * sin + dy * cos) / scale,
  };
}

/**
 * Plans a card's flight from where it left the wheel to where it lands. The arc is planned
 * on screen and converted into the slot's frame, so the card lands exactly on
 * a rotated position of a zoomed table. The jumper arcs higher and spins, as
 * if it slipped out of the wheel with the chosen one.
 */
export function planFlight(
  origin: ScreenBox,
  landing: ScreenBox,
  landedWidth: number,
  frame: FlightFrame,
  role: FlightRole,
): FlightPath {
  const isJumper = role === "jumper";
  const startX =
    centre(origin.left, origin.width) - centre(landing.left, landing.width);
  const startY =
    centre(origin.top, origin.height) - centre(landing.top, landing.height);
  // Halfway along a curve that bulges above both ends.
  const peakX = startX * 0.35;
  const peakY = startY * 0.35 - landing.height * (isJumper ? 0.55 : 0.35);
  return {
    start: toLocalOffset(startX, startY, frame),
    peak: toLocalOffset(peakX, peakY, frame),
    startScale: origin.width / Math.max(1, landedWidth * frame.scale),
    // Leave the wheel upright on screen, whatever the slot's rotation.
    startRotation: (isJumper ? -220 : -6) - frame.rotation,
  };
}

/** The flight as custom properties read by the `deal-flight` keyframes. */
export function flightStyle(
  path: FlightPath,
): Readonly<Record<string, string>> {
  return {
    "--flight-start-x": `${path.start.x}px`,
    "--flight-start-y": `${path.start.y}px`,
    "--flight-peak-x": `${path.peak.x}px`,
    "--flight-peak-y": `${path.peak.y}px`,
    "--flight-start-scale": String(path.startScale),
    "--flight-start-rotate": `${path.startRotation}deg`,
    "--flight-peak-rotate": `${path.startRotation / 3}deg`,
  };
}

function centre(start: number, size: number): number {
  return start + size / 2;
}
