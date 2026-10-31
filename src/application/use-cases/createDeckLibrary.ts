import {
  atelierStandardDeck,
  phaseOneTestDeck,
} from "@/domain/deck/builtinDecks";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";

export function registerBuiltInDecks(registry: DeckRegistry): DeckRegistry {
  registry.register(atelierStandardDeck);
  registry.register(phaseOneTestDeck);
  return registry;
}
