import type { Spread } from "@/domain/spread/types";

/**
 * Identifies a fully drawn round. Instance numbers can start over after the
 * table is cleared, so each draw's time is part of the key.
 */
export function roundKeyOf(spread: Spread): string | undefined {
  if (spread.positions.length === 0) return undefined;
  const parts: string[] = [];
  for (const position of spread.positions) {
    const result = position.drawResult;
    if (!result) return undefined;
    parts.push(`${result.primary.instanceId}@${result.drawnAt}`);
  }
  return parts.join("|");
}
