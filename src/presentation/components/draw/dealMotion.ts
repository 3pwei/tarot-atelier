import type { CSSProperties } from "react";

/**
 * One source of truth for shuffle and deal timing. CSS keyframes run the
 * motion on the compositor, so it stays smooth on slow phones; these values
 * reach the stylesheet as custom properties and the dealer waits on them.
 */
export const SHUFFLE_MS = 1300;
/** Time for one card to fly from the deck to its position. */
export const FLIGHT_MS = 900;
/** Gap between consecutive positions when a whole spread is dealt. */
export const DEAL_STAGGER_MS = 180;
/** The jumper leaves the deck this long after its position's main card. */
export const JUMPER_DELAY_MS = 420;

/** A position being dealt, in dealing order. */
export interface DealtPosition {
  readonly hasJumper: boolean;
}

/** How long dealing takes: until the last card, jumpers included, lands. */
export function dealDurationMs(dealt: readonly DealtPosition[]): number {
  return dealt.reduce(
    (longest, position, order) =>
      Math.max(
        longest,
        order * DEAL_STAGGER_MS +
          (position.hasJumper ? JUMPER_DELAY_MS : 0) +
          FLIGHT_MS,
      ),
    0,
  );
}

/** Timing custom properties for the element that hosts the table. */
export function motionTimingStyle(): CSSProperties {
  return {
    "--shuffle-duration": `${SHUFFLE_MS}ms`,
    "--flight-duration": `${FLIGHT_MS}ms`,
    "--deal-stagger": `${DEAL_STAGGER_MS}ms`,
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
 * Plans a card's flight from the deck to where it lands. The arc is planned
 * on screen and converted into the slot's frame, so the card lands exactly on
 * a rotated position of a zoomed table. The jumper arcs higher and spins, as
 * if the deck pushed it out on its own.
 */
export function planFlight(
  deck: ScreenBox,
  landing: ScreenBox,
  landedWidth: number,
  frame: FlightFrame,
  role: FlightRole,
): FlightPath {
  const isJumper = role === "jumper";
  const startX =
    centre(deck.left, deck.width) - centre(landing.left, landing.width);
  const startY =
    centre(deck.top, deck.height) - centre(landing.top, landing.height);
  // Halfway along a curve that bulges above both ends.
  const peakX = startX * 0.35;
  const peakY = startY * 0.35 - landing.height * (isJumper ? 0.55 : 0.35);
  return {
    start: toLocalOffset(startX, startY, frame),
    peak: toLocalOffset(peakX, peakY, frame),
    startScale: deck.width / Math.max(1, landedWidth * frame.scale),
    // Leave the deck upright on screen, whatever the slot's rotation.
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
