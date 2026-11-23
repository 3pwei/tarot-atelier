import { atelierStandardDeck } from "@/domain/deck/builtinDecks";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";

/** Registers the decks the site ships with. Test decks are registered by tests. */
export function registerBuiltInDecks(registry: DeckRegistry): DeckRegistry {
  registry.register(atelierStandardDeck);
  return registry;
}
