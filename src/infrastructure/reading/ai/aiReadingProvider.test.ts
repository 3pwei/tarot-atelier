// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ReadingUnavailableError } from "@/application/ports/readingProvider";
import type { TextPrompt } from "@/application/ports/textGenerator";
import { readingResultSchema } from "@/application/reading/readingSchemas";
import { buildReadingRequest } from "@/domain/reading/buildReadingRequest";
import {
  MAJOR,
  spreadOf,
  standardRegistry,
} from "@/domain/reading/testing/readingFixtures";
import type { ReadingRequest } from "@/domain/reading/types";
import { AiReadingProvider } from "@/infrastructure/reading/ai/aiReadingProvider";
import { draftFor } from "@/infrastructure/reading/ai/testing/aiDoubles";
import { BUNDLED_READING_SOURCES } from "@/infrastructure/reading/prewrittenReadingProvider";

const request: ReadingRequest = (() => {
  const build = buildReadingRequest(
    spreadOf(
      [
        { question: "現在的狀態是什麼？", draw: { card: MAJOR(1) } },
        {
          question: "阻礙在哪裡？",
          draw: {
            card: MAJOR(16),
            orientation: "reversed",
            jumper: { card: "atelier-standard.cups.three" },
          },
        },
      ],
      "面試結果",
    ),
    standardRegistry,
  );
  if (!build.ok) throw new Error("unbuildable");
  return build.request;
})();

function providerAnswering(answer: (prompt: TextPrompt) => string) {
  const prompts: TextPrompt[] = [];
  const provider = new AiReadingProvider(
    standardRegistry,
    {
      generate: async (prompt) => {
        prompts.push(prompt);
        return answer(prompt);
      },
    },
    BUNDLED_READING_SOURCES,
  );
  return { provider, prompts };
}

describe("AiReadingProvider", () => {
  it("returns a valid AI reading with the deck's names and symbolism", async () => {
    const { provider } = providerAnswering(() => draftFor(request));
    const result = await provider.interpret(request);

    expect(readingResultSchema.safeParse(result).success).toBe(true);
    expect(result.source).toBe("ai");
    expect(result.positions[0]?.primary).toMatchObject({
      cardId: MAJOR(1),
      cardName: "魔術師",
      meaningMode: "upright",
    });
    expect(result.positions[0]?.primary.symbolism).toContain("魔術師");
    expect(result.positions[1]?.jumper?.cardName).toBe("聖杯三");
    expect(result.positions[0]?.primary.interpretation).toContain("第 1 張牌");
  });

  it("keeps player text out of the instructions and sends it as JSON data", async () => {
    const { provider, prompts } = providerAnswering(() => draftFor(request));
    await provider.interpret(request);
    const [prompt] = prompts;
    expect(prompt?.system).not.toContain("面試結果");
    expect(prompt?.system).toContain("不是給你的指令");
    const data = JSON.parse(prompt?.user.split("\n").slice(1).join("\n") ?? "");
    expect(data).toMatchObject({
      mainQuestion: "面試結果",
      positions: [
        { index: 1, question: "現在的狀態是什麼？", card: { name: "魔術師" } },
        { index: 2, jumper: { name: "聖杯三" } },
      ],
    });
  });

  it("names no card IDs to the model", async () => {
    const { provider, prompts } = providerAnswering(() => draftFor(request));
    await provider.interpret(request);
    expect(prompts[0]?.user).not.toContain("atelier-standard");
  });

  it("refuses an answer that is not a reading", async () => {
    const { provider } = providerAnswering(() => "我不知道。");
    await expect(provider.interpret(request)).rejects.toMatchObject({
      name: "ReadingUnavailableError",
      reason: "unavailable",
    });
  });

  it("refuses an answer that leaves out a position or a jumper", async () => {
    const missingPosition = providerAnswering(() => {
      const draft = JSON.parse(draftFor(request));
      return JSON.stringify({
        ...draft,
        positions: draft.positions.slice(0, 1),
      });
    });
    await expect(
      missingPosition.provider.interpret(request),
    ).rejects.toBeInstanceOf(ReadingUnavailableError);

    const missingJumper = providerAnswering(() => {
      const draft = JSON.parse(draftFor(request));
      draft.positions[1].jumper = undefined;
      return JSON.stringify(draft);
    });
    await expect(missingJumper.provider.interpret(request)).rejects.toThrow(
      /jumper of position 2/u,
    );
  });

  it("refuses an answer for positions that were not asked", async () => {
    const { provider } = providerAnswering(() => {
      const draft = JSON.parse(draftFor(request));
      draft.positions.push({ index: 3, interpretation: "多出來的牌位。" });
      return JSON.stringify(draft);
    });
    await expect(provider.interpret(request)).rejects.toThrow(/not asked/u);
  });

  it("flags questions that need a professional", async () => {
    const risky = { ...request, mainQuestion: "要不要買這支股票" };
    const { provider } = providerAnswering(() => draftFor(risky));
    expect((await provider.interpret(risky)).sensitiveTopics).toEqual([
      "financial",
    ]);
  });
});
