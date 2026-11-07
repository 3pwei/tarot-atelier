import type { ReadingRequest } from "@/domain/reading/types";
import type { WorkersAiBinding } from "@/infrastructure/reading/ai/workersAiTextGenerator";

/** A well-formed model answer for `request`, as JSON text. */
export function draftFor(request: ReadingRequest): string {
  return JSON.stringify({
    positions: request.positions.map((position) => ({
      index: position.index,
      interpretation: `第 ${position.index} 張牌提醒你，先看清楚眼前的狀況，再決定下一步。`,
      ...(position.jumper
        ? { jumper: "跳牌補充了另一個可以留意的面向。" }
        : {}),
    })),
    synthesis: "整體來看，這組牌描繪的是一段正在調整的過程。",
    reflectionQuestions: ["你最想先釐清的是什麼？"],
    suggestions: ["可以考慮先寫下你最在意的三件事。"],
  });
}

/** A Workers AI binding that answers with `answer` and records its calls. */
export function fakeWorkersAi(
  answer: (inputs: Readonly<Record<string, unknown>>) => Promise<unknown>,
) {
  const calls: { model: string; inputs: Readonly<Record<string, unknown>> }[] =
    [];
  const ai: WorkersAiBinding = {
    run: async (model, inputs) => {
      calls.push({ model, inputs });
      return answer(inputs);
    },
  };
  return { ai, calls };
}
