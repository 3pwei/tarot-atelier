import type {
  InterpretOptions,
  ReadingProvider,
} from "@/application/ports/readingProvider";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type { ReadingRequest, ReadingResult } from "@/domain/reading/types";
import { composeReading } from "@/infrastructure/reading/composeReading";
import {
  loadDeckReadingContent,
  loadReadingPhrases,
} from "@/infrastructure/reading/content/contentLibrary";
import type {
  DeckReadingContent,
  ReadingPhrases,
} from "@/infrastructure/reading/content/readingContent";

export interface PrewrittenReadingSources {
  readonly loadContent: (
    deckId: string,
  ) => Promise<DeckReadingContent | undefined>;
  readonly loadPhrases: () => Promise<ReadingPhrases>;
}

const defaultSources: PrewrittenReadingSources = {
  loadContent: loadDeckReadingContent,
  loadPhrases: loadReadingPhrases,
};

/**
 * Reads cards from content written ahead of time. Runs entirely in the
 * browser: no network call, no model, no cost per reading. Results are
 * labelled `prewritten` so the UI never presents them as live AI.
 */
export class PrewrittenReadingProvider implements ReadingProvider {
  readonly id = "prewritten";
  readonly source = "prewritten" as const;
  readonly #registry: DeckRegistry;
  readonly #sources: PrewrittenReadingSources;

  constructor(
    registry: DeckRegistry,
    sources: PrewrittenReadingSources = defaultSources,
  ) {
    this.#registry = registry;
    this.#sources = sources;
  }

  async interpret(
    request: ReadingRequest,
    options: InterpretOptions = {},
  ): Promise<ReadingResult> {
    options.signal?.throwIfAborted();
    const deck = this.#registry.get(request.deckId);
    if (!deck) throw new Error(`Deck ${request.deckId} is not registered.`);

    const [content, phrases] = await Promise.all([
      this.#sources.loadContent(request.deckId),
      this.#sources.loadPhrases(),
    ]);
    options.signal?.throwIfAborted();
    return composeReading(request, deck, content, phrases);
  }
}
