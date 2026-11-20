import { describe, expect, it } from "vitest";
import {
  attachReading,
  recordRound,
  type ReadingRecord,
} from "@/domain/history/readingHistory";
import {
  FIXTURE_DECK_ID,
  fixtureDraw,
  fixtureReading,
  fixtureSpread,
} from "@/domain/history/testing/historyFixtures";
import { shareableRecord, summarizeText } from "@/domain/share/shareRecord";

function readRecord(): ReadingRecord {
  const record = recordRound({
    id: "r1",
    spread: fixtureSpread({
      questions: ["現在的我"],
      mainQuestion: "這份新工作適合我嗎？",
      draws: [fixtureDraw({ drawNumber: 1, cardId: "c" })],
    }),
    deckId: FIXTURE_DECK_ID,
    recordedAt: new Date("2026-11-20T02:10:00.000Z"),
  });
  if (!record) throw new Error("Expected a record");
  const [withReading] = attachReading([record], record.roundKey, {
    mainQuestion: record.mainQuestion,
    reading: fixtureReading(),
  });
  if (!withReading) throw new Error("Expected a reading");
  return withReading;
}

describe("sharing a round", () => {
  it("keeps everything when questions are shown", () => {
    const record = readRecord();
    expect(shareableRecord(record, "shown")).toBe(record);
  });

  it("removes every question, the reading's copies included", () => {
    const shared = shareableRecord(readRecord(), "hidden");
    expect(shared.mainQuestion).toBe("");
    expect(shared.positions.map((p) => p.question)).toEqual([""]);
    expect(shared.reading?.positions.map((p) => p.question)).toEqual([""]);
    expect(JSON.stringify(shared)).not.toContain("現在的我");
    expect(JSON.stringify(shared)).not.toContain("新工作");
    expect(shared.reading?.synthesis).toBe("整體的提醒。");
  });
});

describe("summarizing text", () => {
  it("keeps text that already fits", () => {
    expect(summarizeText(" 短句。 ", 10)).toBe("短句。");
  });

  it("ends on the last whole sentence that fits", () => {
    expect(summarizeText("第一句話。第二句話比較長一些。", 10)).toBe(
      "第一句話。",
    );
  });

  it("adds an ellipsis when no sentence fits", () => {
    expect(summarizeText("一句沒有標點而且很長的話", 6)).toBe("一句沒有標…");
  });
});
