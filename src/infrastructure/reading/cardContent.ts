import type { Deck } from "@/domain/deck/deck";
import type { CardDefinition } from "@/domain/deck/types";
import {
  deckMeaningText,
  resolveMeaningMode,
} from "@/domain/reading/cardMeaning";
import type { MeaningMode, ReadingCardRef } from "@/domain/reading/types";
import {
  fillTemplate,
  type CardContentEntry,
  type DeckReadingContent,
  type ReadingPhrases,
} from "@/infrastructure/reading/content/readingContent";

/** A drawn card with how it is read and the content to read it by. */
export interface ReadCard {
  readonly card: CardDefinition;
  readonly mode: MeaningMode;
  readonly entry: CardContentEntry;
}

export interface CardSources {
  readonly deck: Deck;
  /** `undefined` for decks without pre-written content. */
  readonly content: DeckReadingContent | undefined;
  readonly phrases: ReadingPhrases;
}

/** Content for decks without their own, built from the deck's meanings. */
function fallbackEntry(
  card: CardDefinition,
  mode: MeaningMode,
  phrases: ReadingPhrases,
): CardContentEntry {
  const keywords =
    card.keywords.length > 0 ? card.keywords : [card.name.zhHant];
  const [firstKeyword = card.name.zhHant] = keywords;
  const angles = keywords
    .slice(0, 3)
    .map((keyword) => fillTemplate(phrases.fallback.angle, { keyword }));
  return {
    symbolism: fillTemplate(phrases.fallback.symbolism, {
      card: card.name.zhHant,
      meaning: deckMeaningText(card, mode),
    }),
    angles,
    reflection: fillTemplate(phrases.fallback.reflection, {
      keyword: firstKeyword,
    }),
    suggestion: fillTemplate(phrases.fallback.suggestion, {
      keyword: firstKeyword,
    }),
  };
}

export function readCard(sources: CardSources, ref: ReadingCardRef): ReadCard {
  const card = sources.deck.getCard(ref.id);
  if (!card)
    throw new Error(`Card ${ref.id} is not in deck ${sources.deck.id}`);
  const mode = resolveMeaningMode(sources.deck, card, ref.orientation);
  const written = sources.content?.cards[card.id];
  const entry = written
    ? mode === "reversed"
      ? written.reversed
      : written.upright
    : fallbackEntry(card, mode, sources.phrases);
  return { card, mode, entry };
}

export function symbolismOf(phrases: ReadingPhrases, read: ReadCard): string {
  return read.mode === "neutral"
    ? `${read.entry.symbolism}${phrases.neutralNote}`
    : read.entry.symbolism;
}
