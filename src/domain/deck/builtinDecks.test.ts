import { describe, expect, it } from "vitest";
import { atelierStandardDeck } from "@/domain/deck/builtinDecks";

describe("atelier standard tarot", () => {
  it("contains 78 unique stable card ids", () => {
    const ids = atelierStandardDeck.cards.map((card) => card.id);

    expect(ids).toHaveLength(78);
    expect(new Set(ids).size).toBe(78);
  });

  it("contains 22 major and 56 minor arcana", () => {
    expect(
      atelierStandardDeck.cards.filter((card) => card.category === "major"),
    ).toHaveLength(22);
    expect(
      atelierStandardDeck.cards.filter((card) => card.category === "minor"),
    ).toHaveLength(56);
  });

  it("gives every card bilingual names, meanings, and declared artwork", () => {
    atelierStandardDeck.cards.forEach((card) => {
      expect(card.name.zhHant).not.toHaveLength(0);
      expect(card.name.en).not.toHaveLength(0);
      expect(card.uprightMeaning).not.toHaveLength(0);
      expect(card.reversedMeaning).not.toHaveLength(0);
      expect(card.artwork.face).not.toHaveLength(0);
      expect(card.artwork.back).not.toHaveLength(0);
    });
  });
});
