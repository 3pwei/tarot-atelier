import {
  cardContentMapSchema,
  READING_CONTENT_SCHEMA_VERSION,
  tonePhrasesSchema,
  type DeckReadingContent,
  type TonePhrases,
} from "@/infrastructure/reading/content/readingContent";

export const STANDARD_DECK_ID = "atelier-standard-tarot";

/**
 * Loads the standard deck's content. Each file is a separate chunk, fetched
 * only when a reading is requested, so the first page load is unaffected.
 */
async function loadStandardDeckContent(): Promise<DeckReadingContent> {
  const files = await Promise.all([
    import("./majors-00-10.zh-Hant.json"),
    import("./majors-11-21.zh-Hant.json"),
    import("./minors-wands.zh-Hant.json"),
    import("./minors-cups.zh-Hant.json"),
    import("./minors-swords.zh-Hant.json"),
    import("./minors-pentacles.zh-Hant.json"),
  ]);
  const cards = cardContentMapSchema.parse(
    Object.assign({}, ...files.map((file) => file.default)),
  );
  return {
    schemaVersion: READING_CONTENT_SCHEMA_VERSION,
    deckId: STANDARD_DECK_ID,
    locale: "zh-Hant",
    authorship: {
      writtenBy: "Claude (Anthropic), for Tarot Atelier",
      review: "pending-owner-review",
      license:
        "Original project content; source-available with this repository",
    },
    cards,
  };
}

/** Decks with pre-written content. Add an entry to give another deck its own. */
const DECK_CONTENT_LOADERS: Readonly<
  Record<string, () => Promise<DeckReadingContent>>
> = Object.freeze({
  [STANDARD_DECK_ID]: loadStandardDeckContent,
});

/** `undefined` when a deck has no pre-written content of its own. */
export async function loadDeckReadingContent(
  deckId: string,
): Promise<DeckReadingContent | undefined> {
  return DECK_CONTENT_LOADERS[deckId]?.();
}

export async function loadTonePhrases(): Promise<TonePhrases> {
  const file = await import("./tonePhrases.zh-Hant.json");
  return tonePhrasesSchema.parse(file.default);
}
