// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeWorkersAi } from "@/infrastructure/reading/ai/testing/aiDoubles";
import {
  WorkersAiTextGenerator,
  type AiCallRecord,
} from "@/infrastructure/reading/ai/workersAiTextGenerator";

const prompt = { system: "規則", user: "玩家資料：面試結果" };
const options = {
  model: "@cf/test/model",
  maxOutputTokens: 900,
  timeoutMs: 1_000,
};

/** A clock that moves 1,200 ms each time it is read after the start. */
function steppingClock() {
  let reads = 0;
  return () => (reads++ === 0 ? 0 : 1_200);
}

function generatorWith(answer: () => Promise<unknown>) {
  const logged: AiCallRecord[] = [];
  const { ai, calls } = fakeWorkersAi(answer);
  const generator = new WorkersAiTextGenerator(ai, options, {
    log: (record) => logged.push(record),
    now: steppingClock(),
  });
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
          chat_template_kwargs: { enable_thinking: false },
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

  it("logs time, tokens, stop reason and reasoning size, never the prompt or answer", async () => {
    const { generator, logged } = generatorWith(async () => ({
      choices: [
        {
          message: { content: "秘密答案", reasoning_content: "想了五個字" },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 120, completion_tokens: 340 },
    }));
    expect(await generator.generate(prompt)).toBe("秘密答案");
    expect(logged).toEqual([
      {
        model: "@cf/test/model",
        outcome: "answered",
        elapsedMs: 1_200,
        inputTokens: 120,
        outputTokens: 340,
        finishReason: "stop",
        reasoningChars: 5,
      },
    ]);
    expect(JSON.stringify(logged)).not.toMatch(/面試|秘密|想了/u);
  });

  it("reads an answer with no content as empty, so the reading is refused", async () => {
    const { generator } = generatorWith(async () => ({
      choices: [{ message: { content: null }, finish_reason: "length" }],
    }));
    expect(await generator.generate(prompt)).toBe("");
  });

  it("reports a used-up free allocation as the daily limit", async () => {
    const { generator, logged } = generatorWith(async () => {
      throw new Error(
        "AiError: 4006: you have used up your daily free allocation of 10,000 neurons",
      );
    });
    await expect(generator.generate(prompt)).rejects.toMatchObject({
      reason: "daily-limit",
    });
    expect(logged).toEqual([
      expect.objectContaining({ outcome: "allocation-used-up" }),
    ]);
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
    expect(slow.logged).toEqual([
      { model: "@cf/test/model", outcome: "timeout", elapsedMs: 1_200 },
    ]);
  });
});
