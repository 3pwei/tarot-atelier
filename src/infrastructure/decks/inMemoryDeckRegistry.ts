import type { Deck } from "@/domain/deck/deck";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";

export class InMemoryDeckRegistry implements DeckRegistry {
  readonly #decks = new Map<string, Deck>();
  #selectedDeckId: string | undefined;

  constructor(decks: readonly Deck[] = []) {
    decks.forEach((deck) => this.register(deck));
  }

  register(deck: Deck): void {
    this.#decks.set(deck.id, deck);
    this.#selectedDeckId ??= deck.id;
  }

  list(): readonly Deck[] {
    return [...this.#decks.values()];
  }

  get(deckId: string): Deck | undefined {
    return this.#decks.get(deckId);
  }

  select(deckId: string): void {
    if (!this.#decks.has(deckId)) {
      throw new Error(`Deck is not registered: ${deckId}`);
    }
    this.#selectedDeckId = deckId;
  }

  getSelected(): Deck {
    const deck = this.#selectedDeckId
      ? this.#decks.get(this.#selectedDeckId)
      : undefined;
    if (!deck) {
      throw new Error("No deck is registered");
    }
    return deck;
  }
}
