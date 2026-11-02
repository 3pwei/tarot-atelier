/**
 * Raw text persistence for one stored value. Implementations only move
 * strings; parsing, validation and migration live in the use cases, so a
 * different backend can never bypass them.
 */
export interface TextStorage {
  /** Returns `null` when nothing is stored or storage is unavailable. */
  read(): string | null;
  /** Throws when the value cannot be stored (quota, private mode). */
  write(value: string): void;
  clear(): void;
}

/** The current reading: layout, questions, draws and reveals. */
export type SpreadSessionStorage = TextStorage;

/** The person's named spread templates. */
export type SpreadTemplateStorage = TextStorage;
