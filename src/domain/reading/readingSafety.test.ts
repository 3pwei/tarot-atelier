import { describe, expect, it } from "vitest";
import {
  detectSensitiveTopics,
  findCertaintyPhrases,
  certaintyPhrasesIn,
  readingTexts,
} from "@/domain/reading/readingSafety";
import {
  READING_SCHEMA_VERSION,
  type CardReading,
  type ReadingResult,
} from "@/domain/reading/types";

const card = (interpretation: string): CardReading => ({
  cardId: "c",
  cardName: "牌",
  orientation: "upright",
  meaningMode: "upright",
  symbolism: "象徵",
  interpretation,
});

const reading = (jumperText: string): ReadingResult => ({
  schemaVersion: READING_SCHEMA_VERSION,
  deckId: "d",
  source: "ai",
  positions: [
    {
      index: 1,
      question: "？",
      primary: card("主牌"),
      jumper: card(jumperText),
    },
  ],
  synthesis: "整體",
  reflectionQuestions: ["反思？"],
  suggestions: ["可以考慮休息。"],
  sensitiveTopics: [],
});

describe("certaintyPhrasesIn", () => {
  it("checks every text a player reads, jumpers included", () => {
    expect(readingTexts(reading("跳牌"))).toEqual([
      "整體",
      "反思？",
      "可以考慮休息。",
      "象徵",
      "主牌",
      "象徵",
      "跳牌",
    ]);
    expect(certaintyPhrasesIn(reading("跳牌"))).toEqual([]);
    expect(certaintyPhrasesIn(reading("你注定會失敗，注定"))).toEqual(["注定"]);
  });
});

describe("findCertaintyPhrases", () => {
  it("finds statements of certainty and commands", () => {
    expect(findCertaintyPhrases("你一定會成功，注定如此。")).toEqual([
      "一定會",
      "注定",
    ]);
    expect(findCertaintyPhrases("你必須立刻辭職")).toEqual([
      "你必須",
      "必須立刻",
    ]);
  });

  it("accepts reflective, non-directive wording", () => {
    expect(
      findCertaintyPhrases("可以考慮先整理條件，再決定要不要行動。"),
    ).toEqual([]);
  });
});

describe("detectSensitiveTopics", () => {
  it.each([
    [["我的病情會好轉嗎？"], ["health"]],
    [["這場官司會贏嗎？"], ["legal"]],
    [["該買這支股票嗎？"], ["financial"]],
    [
      ["感情會順利嗎？", "要不要借錢給朋友去看醫生？"],
      ["health", "financial"],
    ],
    [["今年的旅行要去哪裡？"], []],
  ] as const)("detects %j as %j", (texts, topics) => {
    expect(detectSensitiveTopics(texts)).toEqual(topics);
  });
});
