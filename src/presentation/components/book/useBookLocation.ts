"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COVER,
  hashFor,
  placeFromHash,
  samePlace,
  type BookPlace,
} from "@/presentation/components/book/bookPlace";

export interface BookLocation {
  readonly place: BookPlace;
  /** Turns to a place and adds it to the browser history. */
  readonly turnTo: (place: BookPlace) => void;
  /** Swaps the current place without a history entry, e.g. a lost chapter. */
  readonly replaceWith: (place: BookPlace) => void;
}

function urlFor(place: BookPlace): string {
  const hash = hashFor(place);
  return hash || `${window.location.pathname}${window.location.search}`;
}

/**
 * The reader's place, mirrored in the URL hash: a link opens straight at its
 * chapter, and the browser's back button walks back through the book.
 */
export function useBookLocation(): BookLocation {
  // The static page always renders the cover; a hash is read once mounted.
  const [place, setPlace] = useState<BookPlace>(COVER);

  useEffect(() => {
    const fromUrl = () => setPlace(placeFromHash(window.location.hash));
    fromUrl();
    window.addEventListener("popstate", fromUrl);
    return () => window.removeEventListener("popstate", fromUrl);
  }, []);

  const turnTo = useCallback(
    (next: BookPlace) => {
      if (samePlace(place, next)) return;
      window.history.pushState(null, "", urlFor(next));
      setPlace(next);
    },
    [place],
  );

  const replaceWith = useCallback((next: BookPlace) => {
    window.history.replaceState(null, "", urlFor(next));
    setPlace(next);
  }, []);

  return { place, turnTo, replaceWith };
}
