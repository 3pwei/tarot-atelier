import type { CardInstance } from "@/domain/deck/types";
import type { Spread, SpreadPosition } from "@/domain/spread/types";

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

/** A drawn card's place at its position: the primary, or the jumper beside it. */
export type DrawnRole = "primary" | "jumper";

export interface PlacedCard {
  readonly role: DrawnRole;
  readonly instance: CardInstance;
}

/** The cards on `position`, the primary followed by its jumper. */
export function placedCardsOf(position: SpreadPosition): readonly PlacedCard[] {
  const result = position.drawResult;
  if (!result) return [];
  const primary: PlacedCard = { role: "primary", instance: result.primary };
  return result.jumper
    ? [primary, { role: "jumper", instance: result.jumper }]
    : [primary];
}

/** The card with `instanceId` and its position, if it is on the table. */
export function findPlacedCard(
  spread: Spread,
  instanceId: string,
): (PlacedCard & { readonly position: SpreadPosition }) | undefined {
  for (const position of spread.positions) {
    const placed = placedCardsOf(position).find(
      (card) => card.instance.instanceId === instanceId,
    );
    if (placed) return { ...placed, position };
  }
  return undefined;
}

/** Every card on the table, each primary followed by its jumper. */
export function collectDrawnInstances(spread: Spread): readonly CardInstance[] {
  return spread.positions.flatMap((position) =>
    placedCardsOf(position).map((card) => card.instance),
  );
}
