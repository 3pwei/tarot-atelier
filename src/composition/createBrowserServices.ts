import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import { browserReadingConfig } from "@/infrastructure/config/readingConfig";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import {
  LocalStorageTextStorage,
  READING_HISTORY_STORAGE_KEY,
  RETIRED_TABLE_STORAGE_KEY,
  SPREAD_TEMPLATE_STORAGE_KEY,
} from "@/infrastructure/persistence/localStorageTextStorage";
import { createBrowserReadingProvider } from "@/infrastructure/reading/readingProviders";
import { BrowserSharer } from "@/infrastructure/share/browserSharer";
import { renderShareImage } from "@/presentation/components/share/renderShareImage";
import type { AtelierServices } from "@/presentation/services/atelierServices";
import { PUBLIC_BASE_PATH } from "@/shared/config/publicBasePath";

/** The site's adapters: built-in decks, this browser's storage, share sheet and reading endpoint. */
export function createBrowserServices(): AtelierServices {
  const registry = registerBuiltInDecks(new InMemoryDeckRegistry());
  return {
    registry,
    readingProvider: createBrowserReadingProvider(
      registry,
      browserReadingConfig,
    ),
    templateStorage: new LocalStorageTextStorage(SPREAD_TEMPLATE_STORAGE_KEY),
    historyStorage: new LocalStorageTextStorage(READING_HISTORY_STORAGE_KEY),
    retiredTableStorage: new LocalStorageTextStorage(RETIRED_TABLE_STORAGE_KEY),
    share: {
      sharer: new BrowserSharer(),
      renderImage: renderShareImage,
      siteUrl: currentSiteUrl,
    },
  };
}

/** This site's address, so previews and production each point to themselves. */
function currentSiteUrl(): string {
  return `${window.location.origin}${PUBLIC_BASE_PATH}/`;
}
