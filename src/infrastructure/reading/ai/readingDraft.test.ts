// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseReadingDraft } from "@/infrastructure/reading/ai/readingDraft";

const draft = {
  positions: [{ index: 1, interpretation: "這張牌提醒你放慢腳步。" }],
  synthesis: "整體來看，這是一段調整期。",
  reflectionQuestions: ["你在等什麼？"],
  suggestions: ["可以考慮先休息一下。"],
};

describe("parseReadingDraft", () => {
  it("reads a plain JSON answer", () => {
    expect(parseReadingDraft(JSON.stringify(draft))).toEqual({
      ok: true,
      draft,
    });
  });

  it("finds the JSON inside a code fence, a sentence or shown reasoning", () => {
    const wrapped = `<think>先想想</think>好的，以下是解讀：\n\`\`\`json\n${JSON.stringify(draft)}\n\`\`\``;
    expect(parseReadingDraft(wrapped)).toMatchObject({ ok: true });
  });

  it("refuses an answer with no JSON or broken JSON", () => {
    expect(parseReadingDraft("抱歉，我無法解讀。")).toEqual({
      ok: false,
      problem: "no-json",
    });
    expect(parseReadingDraft('{"positions": [')).toEqual({
      ok: false,
      problem: "no-json",
    });
  });

  it("refuses an answer of the wrong shape or far too long", () => {
    expect(
      parseReadingDraft(JSON.stringify({ ...draft, positions: [] })),
    ).toEqual({ ok: false, problem: "invalid-shape" });
    expect(
      parseReadingDraft(
        JSON.stringify({ ...draft, synthesis: "長".repeat(600) }),
      ),
    ).toEqual({ ok: false, problem: "invalid-shape" });
    expect(
      parseReadingDraft(
        JSON.stringify({ ...draft, suggestions: ["一", "二", "三", "四"] }),
      ),
    ).toEqual({ ok: false, problem: "invalid-shape" });
  });
});
