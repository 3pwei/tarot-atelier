import type { TablePoint } from "@/domain/spread/types";

/** Holding still this long on a position switches from moving to rotating. */
export const LONG_PRESS_MS = 450;
/** Rotation snaps to these angles when the drag comes close. */
export const ROTATION_SNAP_STEP = 45;
export const ROTATION_SNAP_TOLERANCE = 4;
/** Too close to the centre the angle jumps around, so it is ignored there. */
export const MIN_ROTATE_RADIUS_PX = 12;

/** Screen angle from `center` to `point`, clockwise from 3 o'clock, in degrees. */
export function pointerAngle(center: TablePoint, point: TablePoint): number {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
}

export function distanceFrom(center: TablePoint, point: TablePoint): number {
  return Math.hypot(point.x - center.x, point.y - center.y);
}

/** Whole degrees, pulled onto the nearest 45° line when within a few degrees. */
export function snapRotation(degrees: number): number {
  const rounded = Math.round(degrees);
  const nearest = Math.round(rounded / ROTATION_SNAP_STEP) * ROTATION_SNAP_STEP;
  const snapped =
    Math.abs(rounded - nearest) <= ROTATION_SNAP_TOLERANCE ? nearest : rounded;
  // Avoid -0, which would read as a different angle in equality checks.
  return snapped === 0 ? 0 : snapped;
}

/**
 * The rotation after turning the pointer from `startAngle` to `angle` around
 * the position's centre, starting from `startRotation`.
 */
export function rotationFromDrag(
  startRotation: number,
  startAngle: number,
  angle: number,
): number {
  return snapRotation(startRotation + (angle - startAngle));
}
