/**
 * The table is either played (shuffle, deal, reveal) or arranged (move and
 * rotate positions). Keeping them apart stops a drag or a long press during
 * play from shifting the spread.
 */
export type TableMode = "play" | "arrange";

export interface TableAbilities {
  /** Positions may be moved and rotated. */
  readonly canArrange: boolean;
  /** Shuffling, dealing and revealing are allowed. */
  readonly canPlay: boolean;
  /** The arrange toggle may be pressed now. */
  readonly canToggleArrange: boolean;
}

/**
 * What the table allows in `mode`. While the deck shuffles or cards fly
 * (`layoutLocked`), nothing is arranged and the mode cannot change.
 */
export function tableAbilities(
  mode: TableMode,
  layoutLocked: boolean,
): TableAbilities {
  return {
    canArrange: mode === "arrange" && !layoutLocked,
    canPlay: mode === "play",
    canToggleArrange: !layoutLocked,
  };
}
