import type { SpreadSessionStorage } from "@/application/ports/spreadSessionStorage";

/** The schema version lives inside the value; the key stays stable. */
export const SPREAD_SESSION_STORAGE_KEY = "tarot-atelier:spread-session";

/**
 * Browser `localStorage` adapter. Access can throw in private windows or when
 * site data is blocked, so every read degrades to "nothing stored".
 */
export class LocalStorageSpreadSessionStorage implements SpreadSessionStorage {
  readonly #key: string;
  readonly #getStorage: () => Storage | undefined;

  constructor(
    key: string = SPREAD_SESSION_STORAGE_KEY,
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
