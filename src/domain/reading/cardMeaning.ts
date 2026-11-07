import type { Deck } from "@/domain/deck/deck";
import type { CardDefinition, Orientation } from "@/domain/deck/types";
import type { MeaningMode } from "@/domain/reading/types";

/**
 * Decides how a drawn card is read. A reversed card is only read as reversed
 * when its deck supports reversals and the card defines a reversed meaning;
 * otherwise it is read neutrally instead of inventing one.
 */
export function resolveMeaningMode(
  deck: Deck,
  card: CardDefinition,
  orientation: Orientation,
): MeaningMode {
  if (orientation === "upright") return "upright";
  const hasReversedMeaning = card.reversedMeaning.trim().length > 0;
  return deck.manifest.supportsReversals && hasReversedMeaning
    ? "reversed"
    : "neutral";
}

/** The deck's own meaning text for a mode; neutral uses the core meaning. */
export function deckMeaningText(
  card: CardDefinition,
  mode: MeaningMode,
): string {
  return mode === "reversed" ? card.reversedMeaning : card.uprightMeaning;
}
