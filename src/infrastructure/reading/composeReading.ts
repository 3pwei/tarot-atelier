import type { Deck } from "@/domain/deck/deck";
import type { CardDefinition, TarotSuit } from "@/domain/deck/types";
import {
  deckMeaningText,
  resolveMeaningMode,
} from "@/domain/reading/cardMeaning";
import { detectSensitiveTopics } from "@/domain/reading/readingSafety";
import {
  READING_SCHEMA_VERSION,
  type CardReading,
  type MeaningMode,
  type ReadingCardRef,
  type ReadingPositionRequest,
  type ReadingRequest,
  type ReadingResult,
} from "@/domain/reading/types";
import {
  fillTemplate,
  type CardContentEntry,
  type DeckReadingContent,
  type TonePhrases,
  type ToneTemplates,
} from "@/infrastructure/reading/content/readingContent";

/** At most this many reflection questions and suggestions per reading. */
export const MAX_REFLECTIONS = 3;
export const MAX_SUGGESTIONS = 3;

/** FNV-1a: a small, stable hash, so the same request reads the same way. */
function hashText(text: string): number {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

type Pick = <T>(options: readonly T[], slot: string) => T;

function pickerFor(request: ReadingRequest): Pick {
  const seed = JSON.stringify(request);
  return (options, slot) => {
    const choice = options[hashText(`${seed}|${slot}`) % options.length];
    if (choice === undefined) throw new Error(`No options for ${slot}`);
    return choice;
  };
}

interface ReadCard {
  readonly card: CardDefinition;
  readonly mode: MeaningMode;
  readonly entry: CardContentEntry;
}

interface Composer {
  readonly deck: Deck;
  readonly content: DeckReadingContent | undefined;
  readonly phrases: TonePhrases;
  readonly tone: ToneTemplates;
  readonly toneName: ReadingRequest["tone"];
  readonly pick: Pick;
}

/** Content for decks without their own, built from the deck's meanings. */
function fallbackEntry(
  card: CardDefinition,
  mode: MeaningMode,
  phrases: TonePhrases,
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

function readCard(composer: Composer, ref: ReadingCardRef): ReadCard {
  const card = composer.deck.getCard(ref.id);
  if (!card)
    throw new Error(`Card ${ref.id} is not in deck ${composer.deck.id}`);
  const mode = resolveMeaningMode(composer.deck, card, ref.orientation);
  const written = composer.content?.cards[card.id];
  const entry = written
    ? mode === "reversed"
      ? written.reversed
      : written.upright
    : fallbackEntry(card, mode, composer.phrases);
  return { card, mode, entry };
}

function symbolismOf(composer: Composer, read: ReadCard): string {
  return read.mode === "neutral"
    ? `${read.entry.symbolism}${composer.phrases.neutralNote}`
    : read.entry.symbolism;
}

function primaryReading(
  composer: Composer,
  position: ReadingPositionRequest,
  read: ReadCard,
): CardReading {
  const slot = `p${position.index}`;
  const label = composer.phrases.orientationLabels[read.mode];
  const written = read.entry.voices?.[composer.toneName];
  // Without a written voice, the first angle sets the theme and the link to
  // the question uses another one, so the two sentences never repeat.
  const [theme = read.entry.symbolism, ...otherAngles] = read.entry.angles;
  const voice =
    written ??
    fillTemplate(composer.pick(composer.tone.minorVoice, `${slot}:voice`), {
      card: read.card.name.zhHant,
      orientation: label,
      theme,
    });
  const linkAngles =
    written || otherAngles.length === 0 ? read.entry.angles : otherAngles;
  const link = fillTemplate(composer.pick(composer.tone.link, `${slot}:link`), {
    question: position.question,
    angle: composer.pick(linkAngles, `${slot}:angle`),
  });
  return {
    cardId: read.card.id,
    cardName: read.card.name.zhHant,
    orientation: position.primary.orientation,
    meaningMode: read.mode,
    symbolism: symbolismOf(composer, read),
    interpretation: `${voice}${link}`,
  };
}

function jumperReading(
  composer: Composer,
  position: ReadingPositionRequest,
  ref: ReadingCardRef,
  read: ReadCard,
): CardReading {
  const slot = `p${position.index}:jumper`;
  return {
    cardId: read.card.id,
    cardName: read.card.name.zhHant,
    orientation: ref.orientation,
    meaningMode: read.mode,
    symbolism: symbolismOf(composer, read),
    interpretation: fillTemplate(composer.pick(composer.tone.jumper, slot), {
      jumper: read.card.name.zhHant,
      jumperOrientation: composer.phrases.orientationLabels[read.mode],
      jumperAngle: composer.pick(read.entry.angles, `${slot}:angle`),
    }),
  };
}

/** The suit that clearly leads among minor cards, if any. */
function leadingSuit(cards: readonly ReadCard[]): TarotSuit | undefined {
  const counts = new Map<TarotSuit, number>();
  for (const { card } of cards) {
    if (card.category === "minor" && card.suit) {
      counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [first, second] = ranked;
  if (!first || first[1] < 2) return undefined;
  return second && second[1] === first[1] ? undefined : first[0];
}

function synthesisOf(
  composer: Composer,
  request: ReadingRequest,
  primaries: readonly ReadCard[],
): string {
  const { synthesis } = composer.tone;
  const count = primaries.length;
  const sentences = [
    request.mainQuestion
      ? fillTemplate(synthesis.openingWithMain, {
          mainQuestion: request.mainQuestion,
          count,
        })
      : fillTemplate(synthesis.openingPlain, { count }),
  ];

  if (count === 1) {
    sentences.push(synthesis.single);
  } else {
    const majorCount = primaries.filter(
      (read) => read.card.category === "major",
    ).length;
    const reversedCount = primaries.filter(
      (read) => read.mode === "reversed",
    ).length;
    const suit = leadingSuit(primaries);
    const patterns: string[] = [];
    if (majorCount >= 2 && majorCount * 2 >= count) {
      patterns.push(fillTemplate(synthesis.majorHeavy, { majorCount }));
    }
    if (suit) {
      patterns.push(
        fillTemplate(synthesis.suitLead, {
          suit: composer.phrases.suitNames[suit],
          suitTheme: composer.phrases.suitThemes[suit],
        }),
      );
    }
    if (reversedCount * 2 > count) patterns.push(synthesis.reversedHeavy);
    sentences.push(...(patterns.length > 0 ? patterns : [synthesis.balanced]));
  }

  if (request.positions.some((position) => position.jumper)) {
    sentences.push(synthesis.jumperPresent);
  }
  return sentences.join("");
}

function firstUnique(
  texts: readonly string[],
  limit: number,
): readonly string[] {
  return [...new Set(texts)].slice(0, limit);
}

/**
 * Composes a reading from pre-written content. Pure and deterministic: the
 * same request, deck and content always give the same reading.
 */
export function composeReading(
  request: ReadingRequest,
  deck: Deck,
  content: DeckReadingContent | undefined,
  phrases: TonePhrases,
): ReadingResult {
  const composer: Composer = {
    deck,
    content,
    phrases,
    tone: phrases.tones[request.tone],
    toneName: request.tone,
    pick: pickerFor(request),
  };

  const reads = request.positions.map((position) => ({
    position,
    primary: readCard(composer, position.primary),
  }));
  const primaries = reads.map((read) => read.primary);
  const positions = reads.map(({ position, primary }) => {
    return {
      index: position.index,
      question: position.question,
      primary: primaryReading(composer, position, primary),
      ...(position.jumper
        ? {
            jumper: jumperReading(
              composer,
              position,
              position.jumper,
              readCard(composer, position.jumper),
            ),
          }
        : {}),
    };
  });

  return {
    schemaVersion: READING_SCHEMA_VERSION,
    deckId: request.deckId,
    tone: request.tone,
    source: "prewritten",
    positions,
    synthesis: synthesisOf(composer, request, primaries),
    reflectionQuestions: firstUnique(
      primaries.map((read) => read.entry.reflection),
      MAX_REFLECTIONS,
    ),
    suggestions: firstUnique(
      primaries.map((read) => read.entry.suggestion),
      MAX_SUGGESTIONS,
    ),
    sensitiveTopics: detectSensitiveTopics([
      request.mainQuestion ?? "",
      ...request.positions.map((position) => position.question),
    ]),
  };
}
