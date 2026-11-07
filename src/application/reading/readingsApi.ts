import { z } from "zod";
import {
  readingFallbackReasonSchema,
  readingResultSchema,
} from "@/application/reading/readingSchemas";
import type { ServeReadingFailure } from "@/application/use-cases/serveReading";

/**
 * The reading endpoint's wire format, shared by the server that answers and
 * the browser that asks. A request body is a `ReadingRequest`.
 */

/** Largest request body accepted; a full twelve-card spread is far smaller. */
export const MAX_READING_REQUEST_BYTES = 16_384;

/** HTTP status for each outcome. */
export const READINGS_STATUS = Object.freeze({
  ok: 200,
  "invalid-request": 400,
  "forbidden-origin": 403,
  "too-large": 413,
  "visitor-limit": 429,
  "daily-limit": 429,
  unavailable: 503,
} satisfies Record<
  ServeReadingFailure | "ok" | "forbidden-origin" | "too-large",
  number
>);

export const readingsSuccessSchema = z.strictObject({
  result: readingResultSchema,
});

/** Why no AI reading was served; the browser falls back and says why. */
export const readingsUnavailableSchema = z.strictObject({
  reason: readingFallbackReasonSchema,
});

export const readingsErrorSchema = z.strictObject({
  error: z.enum(["invalid-request", "forbidden-origin", "too-large"]),
});
