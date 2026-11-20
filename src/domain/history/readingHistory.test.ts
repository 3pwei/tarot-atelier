import { describe, expect, it } from "vitest";
import {
  addRecord,
  attachReading,
  EMPTY_HISTORY,
  isRoundRevealed,
  MAX_HISTORY_RECORDS,
  recordRound,
  removeRecord,
  roundKeyOf,
  type ReadingRecord,
} from "@/domain/history/readingHistory";
import {
  FIXTURE_DECK_ID,
  fixtureDraw,
  fixtureReading,
  fixtureSpread,
} from "@/domain/history/testing/historyFixtures";

const RECORDED_AT = new Date("2026-11-20T02:10:00.000Z");

const threeCards = fixtureSpread({
  questions: ["現在的我", "阻礙", "可能的方向"],
  mainQuestion: "  這份新工作適合我嗎？ ",
  draws: [
    fixtureDraw({ drawNumber: 1, cardId: "atelier-standard.major.17" }),
    fixtureDraw({
      drawNumber: 2,
      cardId: "atelier-standard.swords.seven",
      reversed: true,
      jumperCardId: "atelier-standard.cups.two",
    }),
    fixtureDraw({ drawNumber: 3, cardId: "atelier-standard.wands.ace" }),
  ],
});

function recordOf(round: number, id = `record-${round}`): ReadingRecord {
  const spread = fixtureSpread({
    questions: ["今天"],
    draws: [
      fixtureDraw({
        drawNumber: 1,
        cardId: "atelier-standard.major.00",
        round,
      }),
    ],
  });
  const record = recordRound({
    id,
    spread,
    deckId: FIXTURE_DECK_ID,
    recordedAt: RECORDED_AT,
  });
  if (!record) throw new Error("Expected a record");
  return record;
}

describe("round identity", () => {
  it("has no key until every position is drawn", () => {
    const partial = fixtureSpread({
      questions: ["一", "二"],
      draws: [fixtureDraw({ drawNumber: 1, cardId: "a" })],
    });
    expect(roundKeyOf(partial)).toBeUndefined();
    expect(roundKeyOf(fixtureSpread({ questions: [], draws: [] }))).toBe(
      undefined,
    );
  });

  it("tells apart rounds whose instance numbers started over", () => {
    expect(recordOf(1).roundKey).not.toBe(recordOf(2).roundKey);
  });

  it("is revealed only when every card, the jumper included, is open", () => {
    const allButJumper = new Set([
      `${FIXTURE_DECK_ID}:draw-1:primary`,
      `${FIXTURE_DECK_ID}:draw-2:primary`,
      `${FIXTURE_DECK_ID}:draw-3:primary`,
    ]);
    expect(isRoundRevealed(threeCards, allButJumper)).toBe(false);
    expect(
      isRoundRevealed(
        threeCards,
        new Set([...allButJumper, `${FIXTURE_DECK_ID}:draw-2:jumper`]),
      ),
    ).toBe(true);
  });
});

describe("recording a round", () => {
  it("keeps the questions, positions and cards as they were", () => {
    const record = recordRound({
      id: "r1",
      spread: threeCards,
      deckId: FIXTURE_DECK_ID,
      spreadName: "經典三張",
      recordedAt: RECORDED_AT,
    });
    expect(record).toMatchObject({
      id: "r1",
      recordedAt: "2026-11-20T02:10:00.000Z",
      spreadName: "經典三張",
      mainQuestion: "這份新工作適合我嗎？",
    });
    expect(record?.positions[1]).toEqual({
      index: 2,
      question: "阻礙",
      x: 0.5,
      y: 0.5,
      rotation: 0,
      primary: {
        cardId: "atelier-standard.swords.seven",
        orientation: "reversed",
      },
      jumper: { cardId: "atelier-standard.cups.two", orientation: "reversed" },
    });
    expect(record?.reading).toBeUndefined();
  });

  it("does not record an unfinished round", () => {
    const partial = fixtureSpread({ questions: ["一"], draws: [] });
    expect(
      recordRound({
        id: "r",
        spread: partial,
        deckId: FIXTURE_DECK_ID,
        recordedAt: RECORDED_AT,
      }),
    ).toBeUndefined();
  });
});

describe("history", () => {
  it("puts the newest round first", () => {
    const history = addRecord(
      addRecord(EMPTY_HISTORY, recordOf(1)),
      recordOf(2),
    );
    expect(history.map((record) => record.id)).toEqual([
      "record-2",
      "record-1",
    ]);
  });

  it("records a round once, returning the same history", () => {
    const history = addRecord(EMPTY_HISTORY, recordOf(1));
    expect(addRecord(history, recordOf(1, "again"))).toBe(history);
  });

  it(`keeps the newest ${MAX_HISTORY_RECORDS}, dropping the oldest`, () => {
    let history = EMPTY_HISTORY;
    for (let round = 1; round <= MAX_HISTORY_RECORDS + 1; round += 1) {
      history = addRecord(history, recordOf(round));
    }
    expect(history).toHaveLength(MAX_HISTORY_RECORDS);
    expect(history[0]?.id).toBe(`record-${MAX_HISTORY_RECORDS + 1}`);
    expect(history.some((record) => record.id === "record-1")).toBe(false);
  });

  it("stores a reading and the main question it answered", () => {
    const first = recordOf(1);
    const history = attachReading([first], first.roundKey, {
      mainQuestion: " 新的問題 ",
      reading: fixtureReading(),
    });
    expect(history[0]).toMatchObject({
      mainQuestion: "新的問題",
      reading: fixtureReading(),
    });
  });

  it("replaces the reading when it is generated again", () => {
    const first = recordOf(1);
    const once = attachReading([first], first.roundKey, {
      mainQuestion: "",
      reading: fixtureReading("第一次"),
    });
    const twice = attachReading(once, first.roundKey, {
      mainQuestion: "",
      reading: fixtureReading("第二次"),
    });
    expect(twice[0]?.reading?.synthesis).toBe("第二次");
  });

  it("ignores a reading for a round it does not hold", () => {
    const history = [recordOf(1)];
    expect(
      attachReading(history, "unknown", {
        mainQuestion: "",
        reading: fixtureReading(),
      }),
    ).toBe(history);
  });

  it("removes one record by id", () => {
    const history = [recordOf(1), recordOf(2)];
    expect(removeRecord(history, "record-1").map((r) => r.id)).toEqual([
      "record-2",
    ]);
  });
});
