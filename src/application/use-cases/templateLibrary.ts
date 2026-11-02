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
  let text: string | null;
  try {
    text = storage.read();
  } catch {
    text = null;
  }
  if (text === null) return { status: "default", library: BUILT_IN_TEMPLATES };

  let library: TemplateLibrary | undefined;
  try {
    library = parseTemplateLibrary(JSON.parse(text));
  } catch {
    library = undefined;
  }
  if (library) return { status: "restored", library };

  try {
    storage.clear();
  } catch {
    // The next successful save overwrites it.
  }
  return { status: "discarded", library: BUILT_IN_TEMPLATES };
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
