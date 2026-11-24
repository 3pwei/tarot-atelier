import type { SpreadTemplateStorage } from "@/application/ports/textStorage";
import {
  BUILT_IN_TEMPLATES,
  parseTemplateLibrary,
  serializeTemplateLibrary,
  type TemplateLibrary,
} from "@/domain/spread/templates";

export type LibraryLoad =
  | { readonly status: "default"; readonly library: TemplateLibrary }
  | { readonly status: "restored"; readonly library: TemplateLibrary }
  /** Stored data was unusable; it was removed and the defaults returned. */
  | { readonly status: "discarded"; readonly library: TemplateLibrary };

/** Nothing stored means the built-in templates; an empty list is kept as is. */
export function loadTemplateLibrary(
  storage: SpreadTemplateStorage,
): LibraryLoad {
  const load = libraryFromText(readStoredLibrary(storage));
  if (load.status === "discarded") {
    try {
      storage.clear();
    } catch {
      // The next successful save overwrites it.
    }
  }
  return load;
}

/** The stored text, or null when there is none or it cannot be read. */
export function readStoredLibrary(
  storage: SpreadTemplateStorage,
): string | null {
  try {
    return storage.read();
  } catch {
    return null;
  }
}

/** The library a stored text describes, without touching storage. */
export function libraryFromText(text: string | null): LibraryLoad {
  if (text === null) return { status: "default", library: BUILT_IN_TEMPLATES };
  let library: TemplateLibrary | undefined;
  try {
    library = parseTemplateLibrary(JSON.parse(text));
  } catch {
    library = undefined;
  }
  return library
    ? { status: "restored", library }
    : { status: "discarded", library: BUILT_IN_TEMPLATES };
}

export function saveTemplateLibrary(
  storage: SpreadTemplateStorage,
  library: TemplateLibrary,
): { readonly ok: boolean } {
  try {
    storage.write(serializeTemplateLibrary(library));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
