import { z } from "zod";
import { READING_DRAFT_LENGTHS } from "@/infrastructure/reading/ai/readingPrompt";

/** Accepts answers up to this much longer than asked, before refusing them. */
const LENGTH_SLACK = 2;

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .refine((value) => Array.from(value).length <= max * LENGTH_SLACK, {
      message: `Must be at most ${max * LENGTH_SLACK} characters`,
    });

const L = READING_DRAFT_LENGTHS;

/**
 * Models told to leave out a field often write it as null or "" instead.
 * Both mean "no text", the same as leaving it out.
 */
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    text(max).optional(),
  );

/** What the model writes; card names and symbolism are added from content. */
export const readingDraftSchema = z.object({
  positions: z
    .array(
      z.object({
        index: z.number().int().min(1),
        interpretation: text(L.interpretation.max),
        jumper: optionalText(L.jumper.max),
      }),
    )
    .min(1),
  synthesis: text(L.synthesis.max),
  reflectionQuestions: z.array(text(L.reflection.max)).min(1).max(L.listItems),
  suggestions: z.array(text(L.suggestion.max)).min(1).max(L.listItems),
});

export type ReadingDraft = z.infer<typeof readingDraftSchema>;

/**
 * Models sometimes wrap JSON in a code fence, add a sentence around it or
 * show their reasoning first. Keep only the outermost object.
 */
function jsonObjectIn(text: string): string | undefined {
  const withoutReasoning = text.replace(/<think>[\s\S]*?<\/think>/gu, "");
  const start = withoutReasoning.indexOf("{");
  const end = withoutReasoning.lastIndexOf("}");
  return start >= 0 && end > start
    ? withoutReasoning.slice(start, end + 1)
    : undefined;
}

export type ReadingDraftParse =
  | { readonly ok: true; readonly draft: ReadingDraft }
  | {
      readonly ok: false;
      readonly problem: "no-json" | "invalid-shape";
      /** Where the shape is wrong, e.g. "positions.0.jumper too_big"; no text. */
      readonly where?: readonly string[];
    };

export function parseReadingDraft(text: string): ReadingDraftParse {
  const json = jsonObjectIn(text);
  if (json === undefined) return { ok: false, problem: "no-json" };
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { ok: false, problem: "no-json" };
  }
  const parsed = readingDraftSchema.safeParse(value);
  return parsed.success
    ? { ok: true, draft: parsed.data }
    : {
        ok: false,
        problem: "invalid-shape",
        where: parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "(root)"} ${issue.code}`,
        ),
      };
}
