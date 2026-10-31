import { describe, expect, it } from "vitest";
import {
  atelierStandardDeck,
  phaseOneTestDeck,
} from "@/domain/deck/builtinDecks";
import { shuffleCardIds } from "@/domain/deck/draw";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";

describe("InMemoryDeckRegistry", () => {
  it("switches decks without changing the id-only engine", () => {
    const registry = new InMemoryDeckRegistry([
      atelierStandardDeck,
      phaseOneTestDeck,
    ]);
    const fixedRandom = () => 0;

    const standardOrder = shuffleCardIds(
      registry.getSelected().cards.map((card) => card.id),
      fixedRandom,
    );
    registry.select(phaseOneTestDeck.id);
    const testOrder = shuffleCardIds(
      registry.getSelected().cards.map((card) => card.id),
      fixedRandom,
    );

    expect(standardOrder).toHaveLength(78);
    expect(testOrder).toHaveLength(3);
    expect(
      testOrder.every((cardId) => cardId.startsWith("phase-one-test.")),
    ).toBe(true);
  });
});
