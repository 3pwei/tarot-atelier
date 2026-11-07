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

/** How one model call went: how long, how much, and why it stopped. */
export interface AiCallRecord {
  readonly model: string;
  readonly outcome: "answered" | "timeout" | "allocation-used-up" | "failed";
  readonly elapsedMs: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  /** The model's own reason for stopping, such as "stop" or "length". */
  readonly finishReason?: string;
  /** Characters of hidden reasoning returned; 0 means thinking stayed off. */
  readonly reasoningChars?: number;
}

/** Records how each call went, never what was asked or answered. */
export type AiCallLog = (record: AiCallRecord) => void;

export interface WorkersAiDeps {
  readonly log: AiCallLog;
  /** Milliseconds from any fixed point, for timing calls. */
  readonly now: () => number;
}

const usageSchema = z
  .object({
    prompt_tokens: z.number().optional(),
    completion_tokens: z.number().optional(),
  })
  .optional();

const text = z.string().nullish();

/** Workers AI answers in its own shape or, for newer models, OpenAI's. */
const answerSchema = z.union([
  z.object({ response: z.string(), usage: usageSchema }),
  z.object({
    choices: z
      .array(
        z.object({
          message: z.object({
            content: text,
            reasoning_content: text,
            reasoning: text,
          }),
          finish_reason: text,
        }),
      )
      .min(1),
    usage: usageSchema,
  }),
]);

type Answer = z.infer<typeof answerSchema>;

/** Workers AI error 4006: the account's free daily allocation is used up. */
const ALLOCATION_USED_UP = /\b4006\b|daily free allocation/iu;

class TimeoutError extends Error {
  override readonly name = "TimeoutError";
}

function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), timeoutMs);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

function failureOf(
  error: unknown,
  timeoutMs: number,
): { outcome: AiCallRecord["outcome"]; error: ReadingUnavailableError } {
  if (error instanceof TimeoutError) {
    return {
      outcome: "timeout",
      error: new ReadingUnavailableError(
        "unavailable",
        `Workers AI did not answer within ${timeoutMs} ms.`,
      ),
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return ALLOCATION_USED_UP.test(message)
    ? {
        outcome: "allocation-used-up",
        error: new ReadingUnavailableError(
          "daily-limit",
          "The Workers AI free allocation for today is used up.",
        ),
      }
    : {
        outcome: "failed",
        error: new ReadingUnavailableError(
          "unavailable",
          `Workers AI failed: ${error instanceof Error ? error.name : "error"}.`,
        ),
      };
}

function contentOf(answer: Answer): {
  content: string;
  finishReason?: string;
  reasoningChars: number;
} {
  if ("response" in answer) {
    return { content: answer.response, reasoningChars: 0 };
  }
  const [choice] = answer.choices;
  const reasoning =
    choice?.message.reasoning_content ?? choice?.message.reasoning ?? "";
  return {
    content: choice?.message.content ?? "",
    finishReason: choice?.finish_reason ?? undefined,
    reasoningChars: reasoning.length,
  };
}

/** Generates text with a Cloudflare Workers AI model. */
export class WorkersAiTextGenerator implements TextGenerator {
  readonly #ai: WorkersAiBinding;
  readonly #options: WorkersAiOptions;
  readonly #deps: WorkersAiDeps;

  constructor(
    ai: WorkersAiBinding,
    options: WorkersAiOptions,
    deps: WorkersAiDeps,
  ) {
    this.#ai = ai;
    this.#options = options;
    this.#deps = deps;
  }

  async generate(prompt: TextPrompt, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    const { model, maxOutputTokens, timeoutMs } = this.#options;
    const started = this.#deps.now();
    const elapsed = () => Math.round(this.#deps.now() - started);

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
          // A reading needs no hidden reasoning, and reasoning first made
          // answers miss the time limit.
          chat_template_kwargs: { enable_thinking: false },
        }),
        timeoutMs,
      );
    } catch (error) {
      const failure = failureOf(error, timeoutMs);
      this.#deps.log({ model, outcome: failure.outcome, elapsedMs: elapsed() });
      throw failure.error;
    }

    const answer = answerSchema.safeParse(raw);
    if (!answer.success) {
      this.#deps.log({ model, outcome: "failed", elapsedMs: elapsed() });
      throw new ReadingUnavailableError(
        "unavailable",
        "Workers AI answered in an unexpected shape.",
      );
    }
    const { content, finishReason, reasoningChars } = contentOf(answer.data);
    this.#deps.log({
      model,
      outcome: "answered",
      elapsedMs: elapsed(),
      inputTokens: answer.data.usage?.prompt_tokens,
      outputTokens: answer.data.usage?.completion_tokens,
      finishReason,
      reasoningChars,
    });
    return content;
  }
}
