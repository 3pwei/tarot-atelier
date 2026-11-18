import { describe, expect, it } from "vitest";
import type { SpreadSessionStorage } from "@/application/ports/textStorage";
import {
  clearSpreadSession,
  restoreSpreadSession,
  saveSpreadSession,
} from "@/application/use-cases/spreadSession";
import {
  atelierStandardDeck,
  phaseOneTestDeck,
} from "@/domain/deck/builtinDecks";
import {
  BUILT_IN_TEMPLATES,
  createSpreadFromTemplate,
} from "@/domain/spread/templates";
import { createCardInstance } from "@/domain/deck/draw";
import { assignDraw, type SpreadUpdate } from "@/domain/spread/spread";
import type { SpreadSession } from "@/domain/spread/spreadSnapshot";
import type { Spread } from "@/domain/spread/types";

function unwrap(update: SpreadUpdate): Spread {
  if (!update.ok) throw new Error(`Expected success, got ${update.code}`);
  return update.spread;
}

class MemoryStorage implements SpreadSessionStorage {
  value: string | null = null;
  failWrites = false;
  failReads = false;

  read() {
    if (this.failReads) throw new Error("blocked");
    return this.value;
  }
  write(value: string) {
    if (this.failWrites) throw new Error("quota");
    this.value = value;
  }
  clear() {
    this.value = null;
  }
}

function session(deckId = atelierStandardDeck.id): SpreadSession {
  let next = 0;
  return {
    deckId,
    spread: createSpreadFromTemplate({
      template: BUILT_IN_TEMPLATES[1]!,
      createId: () => `id-${(next += 1)}`,
    }),
    revealedInstanceIds: [],
  };
}

describe("spread session persistence", () => {
  it("restores exactly what was saved", () => {
    const storage = new MemoryStorage();
    expect(saveSpreadSession(storage, session())).toEqual({ ok: true });

    const restored = restoreSpreadSession(storage, atelierStandardDeck);
    expect(restored).toEqual({
      status: "restored",
      session: session(),
      returnedCount: 0,
    });
  });

  it("puts a round left half chosen back in the deck", () => {
    const storage = new MemoryStorage();
    const saved = session();
    const [first] = saved.spread.positions;
    const card = atelierStandardDeck.cards[0]!;
    const halfChosen = unwrap(
      assignDraw(saved.spread, first!.id, {
        primary: createCardInstance({
          instanceId: `${atelierStandardDeck.id}-${card.id}`,
          deckId: atelierStandardDeck.id,
          cardId: card.id,
          supportsReversals: false,
        }),
        drawnAt: "2026-11-18T00:00:00.000Z",
      }),
    );
    saveSpreadSession(storage, { ...saved, spread: halfChosen });

    const restored = restoreSpreadSession(storage, atelierStandardDeck);

    expect(restored).toEqual({
      status: "restored",
      session: saved,
      returnedCount: 1,
    });
  });

  it("reports an empty store and survives blocked storage", () => {
    const storage = new MemoryStorage();
    expect(restoreSpreadSession(storage, atelierStandardDeck)).toEqual({
      status: "empty",
    });
    storage.failReads = true;
    expect(restoreSpreadSession(storage, atelierStandardDeck)).toEqual({
      status: "empty",
    });
  });

  it.each([
    ["broken JSON", "{not json"],
    ["a future version", JSON.stringify({ schemaVersion: 99 })],
    ["a wrong shape", JSON.stringify({ schemaVersion: 1, session: [] })],
  ])("discards %s and clears it", (_, value) => {
    const storage = new MemoryStorage();
    storage.value = value;
    expect(restoreSpreadSession(storage, atelierStandardDeck)).toEqual({
      status: "discarded",
    });
    expect(storage.value).toBeNull();
  });

  it("discards a session saved for a different deck", () => {
    const storage = new MemoryStorage();
    saveSpreadSession(storage, session());
    expect(restoreSpreadSession(storage, phaseOneTestDeck)).toEqual({
      status: "discarded",
    });
  });

  it("never writes an invalid session and reports storage failures", () => {
    const storage = new MemoryStorage();
    const valid = session();
    const invalid: SpreadSession = {
      ...valid,
      spread: {
        ...valid.spread,
        positions: valid.spread.positions.map((position) => ({
          ...position,
          x: Number.NaN,
        })),
      },
    };
    expect(saveSpreadSession(storage, invalid)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(storage.value).toBeNull();

    storage.failWrites = true;
    expect(saveSpreadSession(storage, valid)).toEqual({
      ok: false,
      reason: "storage",
    });
  });

  it("clears the saved spread", () => {
    const storage = new MemoryStorage();
    saveSpreadSession(storage, session());
    clearSpreadSession(storage);
    expect(storage.value).toBeNull();
  });
});
