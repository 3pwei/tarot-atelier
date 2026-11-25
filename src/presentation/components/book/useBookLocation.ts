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
  /**
   * The reader moved here (a tap, a key, the browser's back button), so the
   * page turns. A link opened or a lost chapter replaced simply appears.
   */
  readonly turned: boolean;
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
  const [location, setLocation] = useState<{
    readonly place: BookPlace;
    readonly turned: boolean;
  }>({ place: COVER, turned: false });
  const { place } = location;

  useEffect(() => {
    const fromUrl = (turned: boolean) =>
      setLocation({ place: placeFromHash(window.location.hash), turned });
    fromUrl(false);
    const onPop = () => fromUrl(true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const turnTo = useCallback(
    (next: BookPlace) => {
      if (samePlace(place, next)) return;
      window.history.pushState(null, "", urlFor(next));
      setLocation({ place: next, turned: true });
    },
    [place],
  );

  const replaceWith = useCallback((next: BookPlace) => {
    window.history.replaceState(null, "", urlFor(next));
    setLocation({ place: next, turned: false });
  }, []);

  return { place, turned: location.turned, turnTo, replaceWith };
}
