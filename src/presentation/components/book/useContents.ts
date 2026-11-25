"use client";

import { useEffect, useState } from "react";
import {
  libraryFromText,
  readStoredLibrary,
} from "@/application/use-cases/templateLibrary";
import type { BookPlace } from "@/presentation/components/book/bookPlace";
import {
  contentsFor,
  type ContentsEntry,
} from "@/presentation/components/book/contents";
import { useAtelierServices } from "@/presentation/services/atelierServices";

/**
 * The contents as stored on this device, read again on every turn of the
 * page, so a spread saved inside a chapter is listed once the reader turns
 * back. Undefined until read: storage exists only in the browser.
 */
export function useContents(
  place: BookPlace,
): readonly ContentsEntry[] | undefined {
  const { templateStorage } = useAtelierServices();
  const [read, setRead] = useState<{
    readonly place: BookPlace;
    readonly entries: readonly ContentsEntry[];
  }>();

  // Storage is outside React; reading it after each turn is the sync.
  useEffect(() => {
    const text = readStoredLibrary(templateStorage);
    const entries = contentsFor(libraryFromText(text).library);
    const frame = requestAnimationFrame(() => setRead({ place, entries }));
    return () => cancelAnimationFrame(frame);
  }, [templateStorage, place]);

  return read?.entries;
}
