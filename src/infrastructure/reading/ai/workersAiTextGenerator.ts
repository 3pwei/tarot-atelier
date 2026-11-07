import { z } from "zod";
import { ReadingUnavailableError } from "@/application/ports/readingProvider";
import type {
  TextGenerator,
  TextPrompt,
} from "@/application/ports/textGenerator";

/** The part of Cloudflare's Workers AI binding this adapter uses. */
export interface WorkersAiBinding {
  run(
    model: string,
    inputs: Readonly<Record<string, unknown>>,
  ): Promise<unknown>;
}

export interface WorkersAiOptions {
  readonly model: string;
  readonly maxOutputTokens: number;
  readonly timeoutMs: number;
}

/** Records how much a reading used, never what it said. */
export type UsageLog = (entry: {
  readonly model: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}) => void;

const usageSchema = z
  .object({
    prompt_tokens: z.number().optional(),
    completion_tokens: z.number().optional(),
  })
  .optional();

/** Workers AI answers in its own shape or, for newer models, OpenAI's. */
const answerSchema = z.union([
  z.object({ response: z.string(), usage: usageSchema }),
  z.object({
    choices: z
      .array(z.object({ message: z.object({ content: z.string() }) }))
      .min(1),
    usage: usageSchema,
  }),
]);

/** Workers AI error 4006: the account's free daily allocation is used up. */
const ALLOCATION_USED_UP = /\b4006\b|daily free allocation/iu;

function failureOf(error: unknown): ReadingUnavailableError {
  const message = error instanceof Error ? error.message : String(error);
  return ALLOCATION_USED_UP.test(message)
    ? new ReadingUnavailableError(
        "daily-limit",
        "The Workers AI free allocation for today is used up.",
      )
    : new ReadingUnavailableError(
        "unavailable",
        `Workers AI failed: ${error instanceof Error ? error.name : "error"}.`,
      );
}

function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new ReadingUnavailableError(
            "unavailable",
            `Workers AI did not answer within ${timeoutMs} ms.`,
          ),
        ),
      timeoutMs,
    );
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/** Generates text with a Cloudflare Workers AI model. */
export class WorkersAiTextGenerator implements TextGenerator {
  readonly #ai: WorkersAiBinding;
  readonly #options: WorkersAiOptions;
  readonly #logUsage: UsageLog;

  constructor(
    ai: WorkersAiBinding,
    options: WorkersAiOptions,
    logUsage: UsageLog,
  ) {
    this.#ai = ai;
    this.#options = options;
    this.#logUsage = logUsage;
  }

  async generate(prompt: TextPrompt, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    const { model, maxOutputTokens, timeoutMs } = this.#options;
    let raw: unknown;
    try {
      raw = await withTimeout(
        this.#ai.run(model, {
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          max_tokens: maxOutputTokens,
          temperature: 0.7,
        }),
        timeoutMs,
      );
    } catch (error) {
      throw error instanceof ReadingUnavailableError ? error : failureOf(error);
    }

    const answer = answerSchema.safeParse(raw);
    if (!answer.success) {
      throw new ReadingUnavailableError(
        "unavailable",
        "Workers AI answered in an unexpected shape.",
      );
    }
    this.#logUsage({
      model,
      inputTokens: answer.data.usage?.prompt_tokens,
      outputTokens: answer.data.usage?.completion_tokens,
    });
    return "response" in answer.data
      ? answer.data.response
      : (answer.data.choices[0]?.message.content ?? "");
  }
}
