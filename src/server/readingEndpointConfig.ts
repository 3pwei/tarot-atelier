import { z } from "zod";
import type { WorkersAiBinding } from "@/infrastructure/reading/ai/workersAiTextGenerator";
import type { D1Database } from "@/infrastructure/reading/usage/d1UsageLimiter";

/**
 * The reading endpoint's settings, read from the Cloudflare Pages project's
 * bindings and variables. Defaults live here and nowhere else.
 */
export const READING_ENDPOINT_DEFAULTS = Object.freeze({
  model: "@cf/google/gemma-4-26b-a4b-it",
  dailyReadings: 150,
  visitorDailyReadings: 5,
  maxOutputTokens: 3_000,
  aiTimeoutMs: 25_000,
});

const hasMethod = (name: string) => (value: unknown) =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>)[name] === "function";

const positiveInteger = (fallback: number) =>
  z.coerce.number().int().min(1).default(fallback);

const D = READING_ENDPOINT_DEFAULTS;

const SALT_PROBLEM = "Add a secret VISITOR_SALT of at least 32 characters.";

const endpointEnvSchema = z.object({
  AI: z.custom<WorkersAiBinding>(hasMethod("run"), {
    error: "Add a Workers AI binding named AI.",
  }),
  USAGE_DB: z.custom<D1Database>(hasMethod("prepare"), {
    error: "Add a D1 database binding named USAGE_DB.",
  }),
  VISITOR_SALT: z
    .string({ error: SALT_PROBLEM })
    .min(32, { error: SALT_PROBLEM }),
  AI_MODEL: z.string().trim().min(1).default(D.model),
  DAILY_AI_READINGS: positiveInteger(D.dailyReadings),
  VISITOR_DAILY_AI_READINGS: positiveInteger(D.visitorDailyReadings),
});

export interface ReadingEndpointConfig {
  readonly ai: WorkersAiBinding;
  readonly usageDb: D1Database;
  readonly visitorSalt: string;
  readonly model: string;
  readonly dailyReadings: number;
  readonly visitorDailyReadings: number;
  readonly maxOutputTokens: number;
  readonly aiTimeoutMs: number;
}

export type ReadingEndpointConfigParse =
  | { readonly ok: true; readonly config: ReadingEndpointConfig }
  /** What to fix, without echoing any value. */
  | { readonly ok: false; readonly problems: readonly string[] };

export function readingEndpointConfigOf(
  env: unknown,
): ReadingEndpointConfigParse {
  const parsed = endpointEnvSchema.safeParse(env ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  }
  const values = parsed.data;
  return {
    ok: true,
    config: {
      ai: values.AI,
      usageDb: values.USAGE_DB,
      visitorSalt: values.VISITOR_SALT,
      model: values.AI_MODEL,
      dailyReadings: values.DAILY_AI_READINGS,
      visitorDailyReadings: values.VISITOR_DAILY_AI_READINGS,
      maxOutputTokens: D.maxOutputTokens,
      aiTimeoutMs: D.aiTimeoutMs,
    },
  };
}
