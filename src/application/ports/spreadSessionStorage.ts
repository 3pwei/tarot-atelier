/**
 * Raw persistence for the current spread session. Implementations only move
 * strings; parsing, validation and migration live in the use cases, so a
 * different backend can never bypass them.
 */
export interface SpreadSessionStorage {
  /** Returns `null` when nothing is stored or storage is unavailable. */
  read(): string | null;
  /** Throws when the value cannot be stored (quota, private mode). */
  write(value: string): void;
  clear(): void;
}
