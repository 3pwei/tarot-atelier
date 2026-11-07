// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeWorkersAi } from "@/infrastructure/reading/ai/testing/aiDoubles";
import {
  WorkersAiTextGenerator,
  type UsageLog,
} from "@/infrastructure/reading/ai/workersAiTextGenerator";

const prompt = { system: "規則", user: "玩家資料：面試結果" };
const options = {
  model: "@cf/test/model",
  maxOutputTokens: 900,
  timeoutMs: 1_000,
};

function generatorWith(answer: () => Promise<unknown>) {
  const logged: Parameters<UsageLog>[0][] = [];
  const { ai, calls } = fakeWorkersAi(answer);
  const generator = new WorkersAiTextGenerator(ai, options, (entry) =>
    logged.push(entry),
  );
  return { generator, calls, logged };
}

afterEach(() => vi.useRealTimers());

describe("WorkersAiTextGenerator", () => {
  it("sends the prompt as system and user messages to the configured model", async () => {
    const { generator, calls } = generatorWith(async () => ({
      response: "好",
    }));
    await generator.generate(prompt);
    expect(calls).toEqual([
      {
        model: "@cf/test/model",
        inputs: expect.objectContaining({
          messages: [
            { role: "system", content: "規則" },
            { role: "user", content: "玩家資料：面試結果" },
          ],
          max_tokens: 900,
        }),
      },
    ]);
  });

  it("reads both the Workers AI and the OpenAI answer shapes", async () => {
    const native = generatorWith(async () => ({ response: "甲" }));
    expect(await native.generator.generate(prompt)).toBe("甲");
    const openAi = generatorWith(async () => ({
      choices: [{ message: { content: "乙" } }],
    }));
    expect(await openAi.generator.generate(prompt)).toBe("乙");
  });

  it("logs token usage but never the prompt or the answer", async () => {
    const { generator, logged } = generatorWith(async () => ({
      response: "秘密答案",
      usage: { prompt_tokens: 120, completion_tokens: 340 },
    }));
    await generator.generate(prompt);
    expect(logged).toEqual([
      { model: "@cf/test/model", inputTokens: 120, outputTokens: 340 },
    ]);
    expect(JSON.stringify(logged)).not.toMatch(/面試|秘密/u);
  });

  it("reports a used-up free allocation as the daily limit", async () => {
    const { generator } = generatorWith(async () => {
      throw new Error(
        "AiError: 4006: you have used up your daily free allocation of 10,000 neurons",
      );
    });
    await expect(generator.generate(prompt)).rejects.toMatchObject({
      reason: "daily-limit",
    });
  });

  it("reports other failures, odd shapes and timeouts as unavailable", async () => {
    const failing = generatorWith(async () => {
      throw new Error("InferenceUpstreamError");
    });
    await expect(failing.generator.generate(prompt)).rejects.toMatchObject({
      reason: "unavailable",
    });

    const odd = generatorWith(async () => ({ text: "?" }));
    await expect(odd.generator.generate(prompt)).rejects.toMatchObject({
      reason: "unavailable",
    });

    vi.useFakeTimers();
    const slow = generatorWith(() => new Promise(() => undefined));
    const pending = slow.generator.generate(prompt);
    const assertion = expect(pending).rejects.toThrow(/within 1000 ms/u);
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
  });
});
