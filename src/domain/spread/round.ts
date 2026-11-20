import type { CardInstance } from "@/domain/deck/types";
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

/** Every card on the table, each primary followed by its jumper. */
export function collectDrawnInstances(spread: Spread): readonly CardInstance[] {
  return spread.positions.flatMap((position) => {
    const result = position.drawResult;
    if (!result) return [];
    return result.jumper ? [result.primary, result.jumper] : [result.primary];
  });
}
