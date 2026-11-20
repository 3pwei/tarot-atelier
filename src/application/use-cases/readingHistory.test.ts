import { describe, expect, it } from "vitest";
import { MemoryTextStorage } from "@/application/testing/memoryTextStorage";
import {
  loadReadingHistory,
  parseReadingHistory,
  READING_HISTORY_VERSION,
  saveReadingHistory,
  serializeReadingHistory,
} from "@/application/use-cases/readingHistory";
import {
  attachReading,
  EMPTY_HISTORY,
  recordRound,
  type ReadingRecord,
} from "@/domain/history/readingHistory";
import {
  FIXTURE_DECK_ID,
  fixtureDraw,
  fixtureReading,
  fixtureSpread,
} from "@/domain/history/testing/historyFixtures";

function record(): ReadingRecord {
  const created = recordRound({
    id: "r1",
    spread: fixtureSpread({
      questions: ["現在的我"],
      mainQuestion: "這份新工作適合我嗎？",
      draws: [
        fixtureDraw({
          drawNumber: 1,
          cardId: "atelier-standard.major.17",
          jumperCardId: "atelier-standard.cups.two",
        }),
      ],
    }),
    deckId: FIXTURE_DECK_ID,
    spreadName: "單張",
    recordedAt: new Date("2026-11-20T02:10:00.000Z"),
  });
  if (!created) throw new Error("Expected a record");
  return created;
}

const withReading = attachReading([record()], record().roundKey, {
  mainQuestion: "這份新工作適合我嗎？",
  reading: fixtureReading(),
});

describe("reading history persistence", () => {
  it("is empty when nothing is stored", () => {
    expect(loadReadingHistory(new MemoryTextStorage())).toEqual({
      status: "empty",
      history: EMPTY_HISTORY,
    });
  });

  it("restores what it saved, readings included", () => {
    const storage = new MemoryTextStorage();
    expect(saveReadingHistory(storage, withReading)).toEqual({ ok: true });
    expect(loadReadingHistory(storage)).toEqual({
      status: "restored",
      history: withReading,
    });
  });

  it("stores the format version with the records", () => {
    expect(JSON.parse(serializeReadingHistory(withReading))).toMatchObject({
      version: READING_HISTORY_VERSION,
    });
  });

  it("removes the stored value once the history is emptied", () => {
    const storage = new MemoryTextStorage();
    saveReadingHistory(storage, withReading);
    saveReadingHistory(storage, EMPTY_HISTORY);
    expect(storage.value).toBeNull();
  });

  it("reports a failed write instead of throwing", () => {
    const storage = new MemoryTextStorage();
    storage.failWrites = true;
    expect(saveReadingHistory(storage, withReading)).toEqual({ ok: false });
  });

  it.each([
    ["not JSON", "{"],
    ["a newer version", JSON.stringify({ version: 99, records: [] })],
    ["records that are not a list", JSON.stringify({ version: 1, records: 1 })],
  ])("discards and clears %s", (_, stored) => {
    const storage = new MemoryTextStorage(stored);
    expect(loadReadingHistory(storage)).toEqual({
      status: "discarded",
      history: EMPTY_HISTORY,
    });
    expect(storage.value).toBeNull();
  });

  it("drops a tampered record but keeps the others", () => {
    const [good] = withReading;
    const tampered = { ...good, id: "r2", positions: [] };
    const parsed = parseReadingHistory({
      version: READING_HISTORY_VERSION,
      records: [tampered, good],
    });
    expect(parsed).toEqual({ ok: true, history: [good] });
  });

  it("keeps a round whose stored reading it can no longer read", () => {
    const [good] = withReading;
    const oldReading = { ...good, reading: { schemaVersion: "0.9.0" } };
    const parsed = parseReadingHistory({
      version: READING_HISTORY_VERSION,
      records: [oldReading],
    });
    expect(parsed).toEqual({ ok: true, history: [record()] });
  });

  it("refuses unknown fields, so a record cannot carry extra data", () => {
    const [good] = withReading;
    const parsed = parseReadingHistory({
      version: READING_HISTORY_VERSION,
      records: [{ ...good, secret: "x" }],
    });
    expect(parsed).toEqual({ ok: true, history: [] });
  });
});
