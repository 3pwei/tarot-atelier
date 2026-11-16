import { jumperNeighbourIndex } from "@/domain/deck/draw";

/**
 * The shuffled pile laid out face down for the person to choose from. Every
 * card has a fixed slot for as long as the fan is open; a chosen card leaves
 * a gap instead of shifting the others, so nothing else moves or re-renders.
 */
export interface CardFan {
  /** Cards in the pile when it was fanned out. */
  readonly size: number;
  /** Slots whose card has been chosen or slipped out as a jumper. */
  readonly taken: ReadonlySet<number>;
}

export function openFan(size: number): CardFan {
  return { size, taken: new Set() };
}

/** The card's place in the pile now, counting only cards still in the fan. */
export function pileIndexOf(fan: CardFan, slot: number): number {
  let index = 0;
  for (let earlier = 0; earlier < slot; earlier += 1) {
    if (!fan.taken.has(earlier)) index += 1;
  }
  return index;
}

/** Slots still holding a card, left to right. */
export function openSlots(fan: CardFan): readonly number[] {
  return Array.from({ length: fan.size }, (_, slot) => slot).filter(
    (slot) => !fan.taken.has(slot),
  );
}

/**
 * The slot of the card that slips out with the one at `slot`, by the same
 * neighbour rule the pile uses, so the card seen leaving is the card drawn.
 */
export function jumperSlot(fan: CardFan, slot: number): number | undefined {
  const open = openSlots(fan);
  const index = open.indexOf(slot);
  if (index < 0 || open.length < 2) return undefined;
  return open[jumperNeighbourIndex(index, open.length)];
}

export function takeSlots(fan: CardFan, slots: readonly number[]): CardFan {
  return { ...fan, taken: new Set([...fan.taken, ...slots]) };
}

/** Where a card sits in the fan, relative to the fan's left edge. */
export interface FanPlacement {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
}

export interface FanGeometry {
  /** Horizontal distance between neighbouring cards. */
  readonly spacing: number;
  /** Angle between the first and last card, in degrees. */
  readonly sweep: number;
  /** How far the ends sit below the middle. */
  readonly sag: number;
}

export const FAN_GEOMETRY: FanGeometry = { spacing: 14, sweep: 28, sag: 34 };

/** Lays `size` cards along a shallow arc; computed once per fan. */
export function fanPlacements(
  size: number,
  geometry: FanGeometry = FAN_GEOMETRY,
): readonly FanPlacement[] {
  return Array.from({ length: size }, (_, slot) => {
    const along = size > 1 ? slot / (size - 1) - 0.5 : 0;
    return {
      x: slot * geometry.spacing,
      y: along * along * 4 * geometry.sag,
      rotation: along * geometry.sweep,
    };
  });
}

/** Width the fan needs beyond one card, so it can scroll when wider than the screen. */
export function fanSpan(size: number, geometry: FanGeometry = FAN_GEOMETRY) {
  return Math.max(0, size - 1) * geometry.spacing;
}
