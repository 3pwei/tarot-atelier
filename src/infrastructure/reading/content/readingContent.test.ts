// @vitest-environment node
import { describe, expect, it } from "vitest";
import { atelierStandardDeck } from "@/domain/deck/builtinDecks";
import { POSITION_ROLES } from "@/domain/reading/positionRole";
import { QUESTION_TOPICS } from "@/domain/reading/questionTopic";
import { findCertaintyPhrases } from "@/domain/reading/readingSafety";
import {
  loadDeckReadingContent,
  loadReadingPhrases,
  STANDARD_DECK_ID,
} from "@/infrastructure/reading/content/contentLibrary";
import {
  fillTemplate,
  placeholdersOf,
  TEMPLATE_PLACEHOLDERS,
  TemplateError,
  type DeckReadingContent,
} from "@/infrastructure/reading/content/readingContent";

async function standardContent(): Promise<DeckReadingContent> {
  const content = await loadDeckReadingContent(STANDARD_DECK_ID);
  if (!content) throw new Error("standard content missing");
  return content;
}

/** Every string anywhere inside a value. */
function allTexts(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allTexts);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(allTexts);
  }
  return [];
}

describe("standard deck reading content", () => {
  it("covers exactly the deck's 78 cards, upright and reversed", async () => {
    const content = await standardContent();
    expect(Object.keys(content.cards).sort()).toEqual(
      atelierStandardDeck.cards.map((card) => card.id).sort(),
    );
  });

  it("writes a full explanation for every major arcana card", async () => {
    const content = await standardContent();
    for (const card of atelierStandardDeck.cards.filter(
      (c) => c.category === "major",
    )) {
      expect(content.cards[card.id]?.upright.core, card.id).toBeTruthy();
      expect(content.cards[card.id]?.reversed.core, card.id).toBeTruthy();
    }
  });

  it("gives minor arcana core content that templates voice", async () => {
    const content = await standardContent();
    const minors = atelierStandardDeck.cards.filter(
      (c) => c.category === "minor",
    );
    expect(minors).toHaveLength(56);
    for (const card of minors) {
      expect(content.cards[card.id]?.upright.core).toBeUndefined();
    }
  });

  it("asks reflection questions and offers non-directive suggestions", async () => {
    const content = await standardContent();
    for (const [cardId, card] of Object.entries(content.cards)) {
      for (const entry of [card.upright, card.reversed]) {
        expect(entry.reflection.endsWith("？"), cardId).toBe(true);
        expect(entry.suggestion.startsWith("可以考慮"), cardId).toBe(true);
      }
    }
  });

  it("never states the future as certain or orders the reader around", async () => {
    const texts = [
      ...allTexts(await standardContent()),
      ...allTexts(await loadReadingPhrases()),
    ];
    const offending = texts.filter(
      (text) => findCertaintyPhrases(text).length > 0,
    );
    expect(offending).toEqual([]);
  });

  it("records who wrote the content and that it awaits owner review", async () => {
    expect((await standardContent()).authorship).toMatchObject({
      review: "pending-owner-review",
    });
  });

  it("has no content for decks without their own", async () => {
    expect(await loadDeckReadingContent("phase-one-test-deck")).toBeUndefined();
  });
});

describe("reading phrases", () => {
  it("cover every position role", async () => {
    const phrases = await loadReadingPhrases();
    expect(Object.keys(phrases.roles).sort()).toEqual(
      [...POSITION_ROLES].sort(),
    );
  });

  it("only use the placeholders each template is filled with", async () => {
    const phrases = await loadReadingPhrases();
    const check = (texts: readonly string[], allowed: readonly string[]) => {
      for (const text of texts) {
        for (const name of placeholdersOf(text)) {
          expect(allowed, text).toContain(name);
        }
      }
    };
    check(phrases.minorCore, TEMPLATE_PLACEHOLDERS.minorCore);
    check(phrases.jumper, TEMPLATE_PLACEHOLDERS.jumper);
    check(Object.values(phrases.synthesis), TEMPLATE_PLACEHOLDERS.synthesis);
    check(Object.values(phrases.fallback), TEMPLATE_PLACEHOLDERS.fallback);
    for (const role of Object.values(phrases.roles)) {
      check([role.position], TEMPLATE_PLACEHOLDERS.rolePosition);
      check(role.anchors, TEMPLATE_PLACEHOLDERS.roleAnchor);
    }
    check(phrases.cardLink, TEMPLATE_PLACEHOLDERS.cardLink);
    for (const lines of Object.values(phrases.topics)) {
      check(Object.values(lines), TEMPLATE_PLACEHOLDERS.topicLine);
    }
  });

  it("speak to every question topic in every position role", async () => {
    const phrases = await loadReadingPhrases();
    expect(Object.keys(phrases.topics).sort()).toEqual(
      [...QUESTION_TOPICS].sort(),
    );
    for (const lines of Object.values(phrases.topics)) {
      expect(Object.keys(lines).sort()).toEqual([...POSITION_ROLES].sort());
    }
  });
});

describe("fillTemplate", () => {
  it("fills placeholders without re-reading inserted values", () => {
    expect(
      fillTemplate("對「{mainQuestion}」：{angle}", {
        mainQuestion: "{angle}?",
        angle: "慢慢來",
      }),
    ).toBe("對「{angle}?」：慢慢來");
  });

  it("fails loudly when a value is missing", () => {
    expect(() => fillTemplate("{card}", {})).toThrow(TemplateError);
  });
});
