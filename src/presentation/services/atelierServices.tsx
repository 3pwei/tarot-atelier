"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ReadingProvider } from "@/application/ports/readingProvider";
import type {
  ReadingHistoryStorage,
  RetiredTableStorage,
  SpreadTemplateStorage,
} from "@/application/ports/textStorage";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import type { ShareServices } from "@/presentation/components/share/SharePanel";

/**
 * Everything the interface needs from the outside world, as ports. The
 * concrete adapters are chosen once, in `src/composition`, so components
 * never reach into infrastructure and tests swap any of them freely.
 */
export interface AtelierServices {
  readonly registry: DeckRegistry;
  readonly readingProvider: ReadingProvider;
  readonly templateStorage: SpreadTemplateStorage;
  readonly historyStorage: ReadingHistoryStorage;
  /** Where earlier versions kept the table; cleared on load. */
  readonly retiredTableStorage: RetiredTableStorage;
  readonly share: ShareServices;
}

const AtelierServicesContext = createContext<AtelierServices | undefined>(
  undefined,
);

export function AtelierServicesProvider({
  services,
  children,
}: {
  readonly services: AtelierServices;
  readonly children: ReactNode;
}) {
  return (
    <AtelierServicesContext value={services}>{children}</AtelierServicesContext>
  );
}

export function useAtelierServices(): AtelierServices {
  const services = useContext(AtelierServicesContext);
  if (!services) {
    throw new Error(
      "No AtelierServicesProvider above this component. Wrap the page in <BrowserServices> from src/composition, or in tests render inside <AtelierServicesProvider services={createTestServices()}>.",
    );
  }
  return services;
}
