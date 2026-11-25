/**
 * Where the reader is in the book. The site is one static page, so a place
 * is client state; the URL hash mirrors it so links and the back button work.
 */
export type BookPlace =
  | { readonly kind: "cover" }
  | { readonly kind: "frontispiece" }
  | { readonly kind: "contents" }
  | { readonly kind: "chapter"; readonly templateId: string }
  | { readonly kind: "codex" }
  | { readonly kind: "records" };

export const COVER: BookPlace = Object.freeze({ kind: "cover" });
export const FRONTISPIECE: BookPlace = Object.freeze({ kind: "frontispiece" });
export const CONTENTS: BookPlace = Object.freeze({ kind: "contents" });
export const CODEX: BookPlace = Object.freeze({ kind: "codex" });
export const RECORDS: BookPlace = Object.freeze({ kind: "records" });

export function chapter(templateId: string): BookPlace {
  return { kind: "chapter", templateId };
}

/** Hash prefix for a spread's chapter, e.g. `#spread-three-card`. */
const CHAPTER_HASH_PREFIX = "spread-";

/** Template ids are generated or built in; anything else is not a link. */
const TEMPLATE_ID_PATTERN = /^[A-Za-z0-9-]{1,80}$/u;

/**
 * The place a link points to. An empty or unknown hash opens at the cover,
 * so a stray fragment never strands the reader on a blank page.
 */
export function placeFromHash(hash: string): BookPlace {
  const name = hash.startsWith("#") ? hash.slice(1) : hash;
  if (name === "contents") return CONTENTS;
  if (name === "codex") return CODEX;
  if (name === "records") return RECORDS;
  if (name.startsWith(CHAPTER_HASH_PREFIX)) {
    const templateId = name.slice(CHAPTER_HASH_PREFIX.length);
    if (TEMPLATE_ID_PATTERN.test(templateId)) return chapter(templateId);
  }
  return COVER;
}

/** The hash for a place; the cover and frontispiece have none. */
export function hashFor(place: BookPlace): string {
  switch (place.kind) {
    case "cover":
    case "frontispiece":
      return "";
    case "contents":
      return "#contents";
    case "codex":
      return "#codex";
    case "records":
      return "#records";
    case "chapter":
      return `#${CHAPTER_HASH_PREFIX}${place.templateId}`;
  }
}

/** Where `Back` leads: every chapter and appendix returns to the contents. */
export function placeBefore(place: BookPlace): BookPlace {
  switch (place.kind) {
    case "cover":
    case "frontispiece":
      return COVER;
    case "contents":
      return FRONTISPIECE;
    case "chapter":
    case "codex":
    case "records":
      return CONTENTS;
  }
}

export function samePlace(a: BookPlace, b: BookPlace): boolean {
  if (a.kind === "chapter" && b.kind === "chapter") {
    return a.templateId === b.templateId;
  }
  return a.kind === b.kind;
}
