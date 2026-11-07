import type { ReadingRequest, ReadingResult } from "@/domain/reading/types";

/** A result must answer the request it was given, position for position. */
export function answersRequest(
  result: ReadingResult,
  request: ReadingRequest,
): boolean {
  return (
    result.deckId === request.deckId &&
    result.positions.length === request.positions.length &&
    result.positions.every((position, order) => {
      const asked = request.positions[order];
      return (
        asked !== undefined &&
        position.index === asked.index &&
        position.primary.cardId === asked.primary.id &&
        position.jumper?.cardId === asked.jumper?.id
      );
    })
  );
}
