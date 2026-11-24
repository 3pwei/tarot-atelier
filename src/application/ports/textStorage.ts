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

/**
 * Where earlier versions kept the table between visits. Nothing is written
 * there any more; it is only cleared, so the old copy does not linger.
 */
export type RetiredTableStorage = TextStorage;

/** The person's named spread templates. */
export type SpreadTemplateStorage = TextStorage;

/** The finished rounds kept on this device. */
export type ReadingHistoryStorage = TextStorage;

/** Whether the book's pages make a sound when they turn. */
export type SoundPreferenceStorage = TextStorage;
