import { MemoryTextStorage } from "@/application/testing/memoryTextStorage";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import { PrewrittenReadingProvider } from "@/infrastructure/reading/prewrittenReadingProvider";
import { fakeShareServices } from "@/presentation/components/share/testing/fakeShareServices";
import type { AtelierServices } from "@/presentation/services/atelierServices";

/**
 * Services for tests: the built-in decks, pre-written readings, in-memory
 * storage and a share sheet that records what it was given. Pass any service
 * to replace it.
 */
export function createTestServices(
  overrides: Partial<AtelierServices> = {},
): AtelierServices {
  const registry =
    overrides.registry ?? registerBuiltInDecks(new InMemoryDeckRegistry());
  return {
    registry,
    readingProvider: new PrewrittenReadingProvider(registry),
    templateStorage: new MemoryTextStorage(),
    historyStorage: new MemoryTextStorage(),
    retiredTableStorage: new MemoryTextStorage(),
    share: fakeShareServices().services,
    ...overrides,
  };
}
