import { describe, expect, it } from "vitest";
import { detectQuestionTopic } from "@/domain/reading/questionTopic";

describe("detectQuestionTopic", () => {
  it.each([
    ["面試結果", "work"],
    ["這份工作適合我嗎？", "work"],
    ["我和他的感情會如何？", "love"],
    ["有機會復合嗎？", "love"],
    ["這次考試的準備", "study"],
    ["和家人的關係", "relationships"],
    ["我的人生方向", "direction"],
    ["今天的運勢", "general"],
  ] as const)("reads %j as %s", (question, topic) => {
    expect(detectQuestionTopic(question)).toBe(topic);
  });

  it("prefers the more specific area when several match", () => {
    expect(detectQuestionTopic("和同事的人際關係")).toBe("work");
    expect(detectQuestionTopic("家人反對我的感情")).toBe("love");
    expect(detectQuestionTopic("要不要選擇轉職？")).toBe("work");
  });

  it("reads an empty question as general", () => {
    expect(detectQuestionTopic("")).toBe("general");
  });
});
