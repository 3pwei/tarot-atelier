import { describe, expect, it } from "vitest";
import {
  atelierStandardManifest,
  phaseOneTestDeck,
} from "@/domain/deck/builtinDecks";
import { parseDeckManifest } from "@/domain/deck/deckManifestParser";
import { createCardInstance, shuffleCardIds } from "@/domain/deck/draw";

describe("deck-independent engine", () => {
  it("shuffles identifiers without resolving card definitions", () => {
    const result = shuffleCardIds(["deck.card-a", "deck.card-b"], () => 0);

    expect(result).toEqual(["deck.card-b", "deck.card-a"]);
  });

  it("keeps card identity stable when artwork is replaced", () => {
    const original = atelierStandardManifest.cards[0];
    expect(original).toBeDefined();
    const replacement = parseDeckManifest({
      ...atelierStandardManifest,
      cards: atelierStandardManifest.cards.map((card, index) =>
        index === 0
          ? {
              ...card,
              artwork: {
                ...card.artwork,
                face: "https://example.com/replacement.webp",
              },
            }
          : card,
      ),
    });

    expect(replacement.cards[0]?.id).toBe(original?.id);
    expect(replacement.cards[0]?.artwork.face).not.toBe(original?.artwork.face);
  });

  it("never creates reversed instances when the deck disables reversals", () => {
    const instance = createCardInstance({
      instanceId: "reading-1-card-1",
      deckId: phaseOneTestDeck.id,
      cardId: phaseOneTestDeck.cards[0]?.id ?? "",
      supportsReversals: phaseOneTestDeck.manifest.supportsReversals,
      random: () => 0.99,
    });

    expect(instance.orientation).toBe("upright");
  });
});
