import type { Deck } from "@/domain/deck/deck";

export interface DeckRegistry {
  register(deck: Deck): void;
  list(): readonly Deck[];
  get(deckId: string): Deck | undefined;
  select(deckId: string): void;
  getSelected(): Deck;
}
