import { describe, expect, it } from "vitest";
import {
  atelierStandardManifest,
  phaseOneTestManifest,
} from "@/domain/deck/builtinDecks";
import {
  DeckManifestError,
  parseDeckManifest,
} from "@/domain/deck/deckManifestParser";

function withChanges(
  changes: Record<string, unknown>,
): Record<string, unknown> {
  return { ...atelierStandardManifest, ...changes };
}

describe("parseDeckManifest", () => {
  it("accepts the supported schema version", () => {
    expect(parseDeckManifest(atelierStandardManifest).cards).toHaveLength(78);
  });

  it("rejects unsupported schema versions", () => {
    expect(() =>
      parseDeckManifest(withChanges({ schemaVersion: "2.0.0" })),
    ).toThrowError(DeckManifestError);
  });

  it("rejects duplicate card ids", () => {
    const firstCard = atelierStandardManifest.cards[0];
    expect(firstCard).toBeDefined();

    expect(() =>
      parseDeckManifest(withChanges({ cards: [firstCard, firstCard] })),
    ).toThrowError(/duplicate card id/u);
  });

  it("rejects a card with a missing image declaration", () => {
    const card = phaseOneTestManifest.cards[0];
    expect(card).toBeDefined();

    expect(() =>
      parseDeckManifest({
        ...phaseOneTestManifest,
        cards: [
          {
            ...card,
            artwork: { ...card?.artwork, face: "" },
          },
        ],
      }),
    ).toThrowError(/artwork.face is required/u);
  });

  it.each([0, 201])("rejects a deck containing %i cards", (size) => {
    const source = phaseOneTestManifest.cards[0];
    expect(source).toBeDefined();
    const cards = Array.from({ length: size }, (_, index) => ({
      ...source,
      id: `size-test.${index}`,
    }));

    expect(() =>
      parseDeckManifest({ ...phaseOneTestManifest, cards }),
    ).toThrowError(/1 to 200 cards/u);
  });
});
