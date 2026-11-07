import { describe, expect, it } from "vitest";
import {
  detectSensitiveTopics,
  findCertaintyPhrases,
} from "@/domain/reading/readingSafety";

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
