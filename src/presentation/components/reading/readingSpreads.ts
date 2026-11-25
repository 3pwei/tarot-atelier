/**
 * How many spreads a reading set in columns fills: its flow is as wide as
 * one spread and runs on to the right, a column gap between every column,
 * spreads included.
 */
export function spreadCount(
  flowWidth: number,
  spreadWidth: number,
  columnGap: number,
): number {
  if (spreadWidth <= 0) return 1;
  // A rounding pixel never makes a spread of its own.
  const spreads = (flowWidth + columnGap - 1) / (spreadWidth + columnGap);
  return Math.max(1, Math.ceil(spreads));
}

/** Keeps a spread within the reading, whose length may have just changed. */
export function spreadWithin(page: number, count: number): number {
  return Math.min(Math.max(0, page), count - 1);
}
