import {
  ReadingUnavailableError,
  type InterpretOptions,
  type ReadingProvider,
} from "@/application/ports/readingProvider";
import type { TextGenerator } from "@/application/ports/textGenerator";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import { deckMeaningText } from "@/domain/reading/cardMeaning";
import { detectSensitiveTopics } from "@/domain/reading/readingSafety";
import {
  READING_SCHEMA_VERSION,
  type CardReading,
  type ReadingCardRef,
  type ReadingRequest,
  type ReadingResult,
} from "@/domain/reading/types";
import {
  parseReadingDraft,
  type ReadingDraft,
} from "@/infrastructure/reading/ai/readingDraft";
import {
  readingPrompt,
  type PromptCard,
  type PromptSpread,
} from "@/infrastructure/reading/ai/readingPrompt";
import {
  readCard,
  symbolismOf,
  type CardSources,
  type ReadCard,
} from "@/infrastructure/reading/cardContent";
import type { PrewrittenReadingSources } from "@/infrastructure/reading/prewrittenReadingProvider";

function promptCard(sources: CardSources, read: ReadCard): PromptCard {
  return {
    name: read.card.name.zhHant,
    orientation: sources.phrases.orientationLabels[read.mode],
    meaning: deckMeaningText(read.card, read.mode),
    keywords: read.card.keywords,
  };
}

function cardReading(
  sources: CardSources,
  ref: ReadingCardRef,
  read: ReadCard,
  interpretation: string,
): CardReading {
  return {
    cardId: read.card.id,
    cardName: read.card.name.zhHant,
    orientation: ref.orientation,
    meaningMode: read.mode,
    symbolism: symbolismOf(sources.phrases, read),
    interpretation,
  };
}

function unusable(problem: string): ReadingUnavailableError {
  return new ReadingUnavailableError(
    "unavailable",
    `The AI answer could not be used: ${problem}.`,
  );
}

/**
 * Reads a spread with a language model. The model writes only the
 * interpretations; card names and symbolism come from the deck and the
 * pre-written content, so it cannot rename or invent a card.
 */
export class AiReadingProvider implements ReadingProvider {
  readonly id = "ai";
  readonly source = "ai" as const;
  readonly #registry: DeckRegistry;
  readonly #generator: TextGenerator;
  readonly #sources: PrewrittenReadingSources;

  constructor(
    registry: DeckRegistry,
    generator: TextGenerator,
    sources: PrewrittenReadingSources,
  ) {
    this.#registry = registry;
    this.#generator = generator;
    this.#sources = sources;
  }

  async interpret(
    request: ReadingRequest,
    options: InterpretOptions = {},
  ): Promise<ReadingResult> {
    const deck = this.#registry.get(request.deckId);
    if (!deck) throw new Error(`Deck ${request.deckId} is not registered.`);
    const [content, phrases] = await Promise.all([
      this.#sources.loadContent(request.deckId),
      this.#sources.loadPhrases(),
    ]);
    const sources: CardSources = { deck, content, phrases };
    const reads = request.positions.map((position) => ({
      position,
      primary: readCard(sources, position.primary),
      jumper: position.jumper ? readCard(sources, position.jumper) : undefined,
    }));

    const spread: PromptSpread = {
      ...(request.mainQuestion ? { mainQuestion: request.mainQuestion } : {}),
      positions: reads.map(({ position, primary, jumper }) => ({
        index: position.index,
        question: position.question,
        card: promptCard(sources, primary),
        ...(jumper ? { jumper: promptCard(sources, jumper) } : {}),
      })),
    };
    const answer = await this.#generator.generate(
      readingPrompt(spread),
      options.signal,
    );
    const parsed = parseReadingDraft(answer);
    if (!parsed.ok) {
      throw unusable(
        parsed.where
          ? `${parsed.problem} (${parsed.where.join(", ")})`
          : parsed.problem,
      );
    }
    return this.#assemble(request, sources, reads, parsed.draft);
  }

  #assemble(
    request: ReadingRequest,
    sources: CardSources,
    reads: readonly {
      readonly position: ReadingRequest["positions"][number];
      readonly primary: ReadCard;
      readonly jumper: ReadCard | undefined;
    }[],
    draft: ReadingDraft,
  ): ReadingResult {
    const written = new Map(draft.positions.map((p) => [p.index, p]));
    const positions = reads.map(({ position, primary, jumper }) => {
      const text = written.get(position.index);
      if (!text) throw unusable(`position ${position.index} is missing`);
      if (position.jumper && jumper && !text.jumper) {
        throw unusable(`the jumper of position ${position.index} is missing`);
      }
      return {
        index: position.index,
        question: position.question,
        primary: cardReading(
          sources,
          position.primary,
          primary,
          text.interpretation,
        ),
        ...(position.jumper && jumper && text.jumper
          ? {
              jumper: cardReading(
                sources,
                position.jumper,
                jumper,
                text.jumper,
              ),
            }
          : {}),
      };
    });
    if (written.size !== positions.length) {
      throw unusable("it answers positions that were not asked");
    }

    return {
      schemaVersion: READING_SCHEMA_VERSION,
      deckId: request.deckId,
      source: "ai",
      positions,
      synthesis: draft.synthesis,
      reflectionQuestions: draft.reflectionQuestions,
      suggestions: draft.suggestions,
      sensitiveTopics: detectSensitiveTopics([
        request.mainQuestion ?? "",
        ...request.positions.map((position) => position.question),
      ]),
    };
  }
}
