import type { SpreadSessionStorage } from "@/application/ports/spreadSessionStorage";
import type { Deck } from "@/domain/deck/deck";
import {
  parseSpreadSnapshot,
  serializeSpreadSession,
  SpreadSnapshotError,
  verifySessionDeck,
  type SpreadSession,
} from "@/domain/spread/spreadSnapshot";

export type RestoreResult =
  | { readonly status: "empty" }
  | {
      readonly status: "restored";
      readonly session: SpreadSession;
      readonly migratedFrom?: number;
    }
  /** Stored data existed but was unusable; it has been removed. */
  | { readonly status: "discarded" };

export type SaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "invalid" | "storage" };

function discard(storage: SpreadSessionStorage): RestoreResult {
  try {
    storage.clear();
  } catch {
    // Nothing else to do: the next successful save overwrites it.
  }
  return { status: "discarded" };
}

/**
 * Loads the saved spread for `deck`. Any unreadable, newer, tampered or
 * mismatched data is discarded so that the table always renders.
 */
export function restoreSpreadSession(
  storage: SpreadSessionStorage,
  deck: Deck,
): RestoreResult {
  let text: string | null;
  try {
    text = storage.read();
  } catch {
    return { status: "empty" };
  }
  if (text === null) return { status: "empty" };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return discard(storage);
  }

  const parsed = parseSpreadSnapshot(raw);
  if (!parsed.ok) return discard(storage);
  if (verifySessionDeck(parsed.session, deck).length > 0) {
    return discard(storage);
  }
  return {
    status: "restored",
    session: parsed.session,
    ...(parsed.migratedFrom ? { migratedFrom: parsed.migratedFrom } : {}),
  };
}

/** Validates before writing: an invalid session is never stored. */
export function saveSpreadSession(
  storage: SpreadSessionStorage,
  session: SpreadSession,
  now: Date = new Date(),
): SaveResult {
  let json: string;
  try {
    json = serializeSpreadSession(session, now);
  } catch (error) {
    if (error instanceof SpreadSnapshotError) {
      return { ok: false, reason: "invalid" };
    }
    throw error;
  }
  try {
    storage.write(json);
    return { ok: true };
  } catch {
    return { ok: false, reason: "storage" };
  }
}

export function clearSpreadSession(storage: SpreadSessionStorage): void {
  try {
    storage.clear();
  } catch {
    // Storage may be unavailable; the in-memory spread is reset regardless.
  }
}
