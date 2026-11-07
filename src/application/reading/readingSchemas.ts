import { z } from "zod";
import {
  MAX_MAIN_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_SPREAD_POSITIONS,
} from "@/domain/spread/types";
import { countCharacters } from "@/domain/spread/spread";
import {
  READING_FALLBACK_REASONS,
  READING_SCHEMA_VERSION,
  type ReadingRequest,
  type ReadingResult,
} from "@/domain/reading/types";

/**
 * The reading formats at every boundary: before a provider is called, on what
 * it returns, and later on a server. The shapes are the domain types; the
 * `satisfies` checks make TypeScript fail if the two ever drift apart.
 */

const MAX_ID_LENGTH = 120;
/** Generous ceilings that stop runaway provider output, not normal text. */
const MAX_TEXT_LENGTH = 2_000;
const MAX_LIST_ITEMS = 6;

const text = (max: number) =>
  z.string().refine((value) => countCharacters(value) <= max, {
    message: `Must be at most ${max} characters`,
  });

const nonBlankText = (max: number) =>
  text(max).refine((value) => value.trim().length > 0, {
    message: "Must not be blank",
  });

const id = z.string().min(1).max(MAX_ID_LENGTH);
const orientation = z.enum(["upright", "reversed"]);
const coordinate = z.number().min(0).max(1);

const cardRef = z.strictObject({ id, orientation });

const positionRequest = z.strictObject({
  index: z.number().int().min(1).max(MAX_SPREAD_POSITIONS),
  question: nonBlankText(MAX_QUESTION_LENGTH),
  x: coordinate,
  y: coordinate,
  primary: cardRef,
  jumper: cardRef.optional(),
});

/** Indexes must be exactly 1..n in order, matching the spread rules. */
function isSequential(items: readonly { readonly index: number }[]): boolean {
  return items.every((item, order) => item.index === order + 1);
}

export const readingRequestSchema = z.strictObject({
  schemaVersion: z.literal(READING_SCHEMA_VERSION),
  deckId: id,
  mainQuestion: nonBlankText(MAX_MAIN_QUESTION_LENGTH).optional(),
  positions: z
    .array(positionRequest)
    .min(1)
    .max(MAX_SPREAD_POSITIONS)
    .refine(isSequential, { message: "Position indexes must be 1..n" }),
}) satisfies z.ZodType<ReadingRequest>;

const cardReading = z.strictObject({
  cardId: id,
  cardName: nonBlankText(MAX_ID_LENGTH),
  orientation,
  meaningMode: z.enum(["upright", "reversed", "neutral"]),
  symbolism: nonBlankText(MAX_TEXT_LENGTH),
  interpretation: nonBlankText(MAX_TEXT_LENGTH),
});

const positionReading = z.strictObject({
  index: z.number().int().min(1).max(MAX_SPREAD_POSITIONS),
  question: nonBlankText(MAX_QUESTION_LENGTH),
  primary: cardReading,
  jumper: cardReading.optional(),
});

export const readingFallbackReasonSchema = z.enum(READING_FALLBACK_REASONS);

const textList = z
  .array(nonBlankText(MAX_TEXT_LENGTH))
  .min(1)
  .max(MAX_LIST_ITEMS);

export const readingResultSchema = z.strictObject({
  schemaVersion: z.literal(READING_SCHEMA_VERSION),
  deckId: id,
  source: z.enum(["prewritten", "ai"]),
  positions: z
    .array(positionReading)
    .min(1)
    .max(MAX_SPREAD_POSITIONS)
    .refine(isSequential, { message: "Position indexes must be 1..n" }),
  synthesis: nonBlankText(MAX_TEXT_LENGTH),
  reflectionQuestions: textList,
  suggestions: textList,
  sensitiveTopics: z.array(z.enum(["health", "legal", "financial"])),
  fallback: z.strictObject({ reason: readingFallbackReasonSchema }).optional(),
}) satisfies z.ZodType<ReadingResult>;

/** Identifies one press of "generate"; a retry reuses it. */
export const readingRequestIdSchema = z.uuid();
