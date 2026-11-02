import type { DrawResult } from "@/domain/deck/draw";

/** A spread holds between one and twelve positions. */
export const MIN_SPREAD_POSITIONS = 1;
export const MAX_SPREAD_POSITIONS = 12;

/** Each position asks exactly one question of 1–300 characters. */
export const MIN_QUESTION_LENGTH = 1;
export const MAX_QUESTION_LENGTH = 300;

/** The optional overall question shares the per-position length ceiling. */
export const MAX_MAIN_QUESTION_LENGTH = MAX_QUESTION_LENGTH;

export type SpreadPresetId = "three-card" | "five-card" | "circle" | "custom";

/**
 * A place on the table. `x`/`y` are table-relative centre coordinates in
 * [0, 1], so the layout is independent of screen size and zoom. `rotation` is
 * in degrees, normalised to [0, 360). `drawResult` holds the primary card and
 * an optional jumper: both belong to this one position and number.
 */
export interface SpreadPosition {
  readonly id: string;
  readonly index: number;
  readonly question: string;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly drawResult?: DrawResult;
}

export interface Spread {
  readonly id: string;
  readonly presetId: SpreadPresetId;
  readonly mainQuestion: string;
  /** Always sorted by `index`; indexes are exactly 1..n. */
  readonly positions: readonly SpreadPosition[];
}

export interface TablePoint {
  readonly x: number;
  readonly y: number;
}
