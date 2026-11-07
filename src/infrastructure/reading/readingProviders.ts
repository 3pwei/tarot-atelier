import type { ReadingProvider } from "@/application/ports/readingProvider";
import { FallbackReadingProvider } from "@/application/reading/fallbackReadingProvider";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type { BrowserReadingConfig } from "@/infrastructure/config/readingConfig";
import { HttpReadingProvider } from "@/infrastructure/reading/httpReadingProvider";
import { PrewrittenReadingProvider } from "@/infrastructure/reading/prewrittenReadingProvider";

/**
 * The browser's reading provider: AI first with pre-written readings as the
 * fallback when AI readings are on, pre-written readings alone otherwise.
 */
export function createBrowserReadingProvider(
  registry: DeckRegistry,
  config: BrowserReadingConfig,
): ReadingProvider {
  const prewritten = new PrewrittenReadingProvider(registry);
  if (!config.aiReadings) return prewritten;
  return new FallbackReadingProvider(
    new HttpReadingProvider({
      endpoint: config.endpoint,
      timeoutMs: config.timeoutMs,
    }),
    prewritten,
  );
}
