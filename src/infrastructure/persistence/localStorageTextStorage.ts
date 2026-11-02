import type { TextStorage } from "@/application/ports/textStorage";

/** Schema versions live inside each value; the keys stay stable. */
export const SPREAD_SESSION_STORAGE_KEY = "tarot-atelier:spread-session";
export const SPREAD_TEMPLATE_STORAGE_KEY = "tarot-atelier:spread-templates";

/**
 * Browser `localStorage` adapter. Access can throw in private windows or when
 * site data is blocked, so every read degrades to "nothing stored".
 */
export class LocalStorageTextStorage implements TextStorage {
  readonly #key: string;
  readonly #getStorage: () => Storage | undefined;

  constructor(
    key: string,
    getStorage: () => Storage | undefined = () =>
      typeof window === "undefined" ? undefined : window.localStorage,
  ) {
    this.#key = key;
    this.#getStorage = getStorage;
  }

  read(): string | null {
    try {
      return this.#getStorage()?.getItem(this.#key) ?? null;
    } catch {
      return null;
    }
  }

  write(value: string): void {
    const storage = this.#getStorage();
    if (!storage) throw new Error("localStorage is unavailable");
    storage.setItem(this.#key, value);
  }

  clear(): void {
    this.#getStorage()?.removeItem(this.#key);
  }
}
