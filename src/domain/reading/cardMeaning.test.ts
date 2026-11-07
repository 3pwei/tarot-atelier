import { describe, expect, it } from "vitest";
import {
  atelierStandardDeck,
  phaseOneTestDeck,
} from "@/domain/deck/builtinDecks";
import { Deck } from "@/domain/deck/deck";
import {
  deckMeaningText,
  resolveMeaningMode,
} from "@/domain/reading/cardMeaning";

const star = atelierStandardDeck.getCard("atelier-standard.major.17")!;
const tide = phaseOneTestDeck.getCard("phase-one-test.tide")!;

describe("resolveMeaningMode", () => {
  it("reads upright cards as upright", () => {
    expect(resolveMeaningMode(atelierStandardDeck, star, "upright")).toBe(
      "upright",
    );
  });

  it("reads reversed cards as reversed when the deck defines it", () => {
    expect(resolveMeaningMode(atelierStandardDeck, star, "reversed")).toBe(
      "reversed",
    );
  });

  it("reads neutrally when the deck does not support reversals", () => {
    expect(resolveMeaningMode(phaseOneTestDeck, tide, "reversed")).toBe(
      "neutral",
    );
  });

  it("reads neutrally when a card has no reversed meaning", () => {
    const blank = { ...star, reversedMeaning: "   " };
    const deck = new Deck({ ...atelierStandardDeck.manifest, cards: [blank] });
    expect(resolveMeaningMode(deck, blank, "reversed")).toBe("neutral");
  });
});

describe("deckMeaningText", () => {
  it("never uses a deck's placeholder reversed text for a neutral reading", () => {
    expect(deckMeaningText(tide, "neutral")).toBe(tide.uprightMeaning);
    expect(deckMeaningText(star, "reversed")).toBe(star.reversedMeaning);
  });
});
