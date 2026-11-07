import {
  isAbortError,
  ReadingUnavailableError,
  type ReadingProvider,
} from "@/application/ports/readingProvider";
import type { UsageLimiter } from "@/application/ports/usageLimiter";
import { answersRequest } from "@/application/reading/answersRequest";
import {
  readingRequestSchema,
  readingResultSchema,
} from "@/application/reading/readingSchemas";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import { isFreeOfCertainty } from "@/domain/reading/readingSafety";
import type {
  ReadingFallbackReason,
  ReadingRequest,
  ReadingResult,
} from "@/domain/reading/types";

export type ServeReadingFailure = "invalid-request" | ReadingFallbackReason;

export type ServeReadingOutcome =
  | { readonly ok: true; readonly result: ReadingResult }
  | { readonly ok: false; readonly failure: ServeReadingFailure };

export interface ServeReadingDeps {
  readonly registry: DeckRegistry;
  readonly limiter: UsageLimiter;
  /** The AI provider; its answer is checked before it reaches a player. */
  readonly provider: ReadingProvider;
}

export interface ReadingVisitor {
  /** An anonymous key for one visitor on one day; never the raw address. */
  readonly key: string;
  readonly day: string;
}

/** The UTC calendar day, matching when the AI provider's allocation resets. */
export function usageDayOf(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Every card in the request belongs to a deck the server knows. */
function isKnownToRegistry(
  request: ReadingRequest,
  registry: DeckRegistry,
): boolean {
  const deck = registry.get(request.deckId);
  return (
    deck !== undefined &&
    request.positions.every(
      (position) =>
        deck.getCard(position.primary.id) !== undefined &&
        (position.jumper === undefined ||
          deck.getCard(position.jumper.id) !== undefined),
    )
  );
}

/** An AI answer is shown only when it is well formed, answers and is safe. */
function isServable(answer: unknown, request: ReadingRequest): boolean {
  const parsed = readingResultSchema.safeParse(answer);
  return (
    parsed.success &&
    parsed.data.source === "ai" &&
    parsed.data.fallback === undefined &&
    answersRequest(parsed.data, request) &&
    isFreeOfCertainty(parsed.data)
  );
}

/**
 * Serves one AI reading on the server: validates the request, counts it
 * against the visitor's and the site's daily limits, asks the provider and
 * refuses any answer that is malformed, off-request or states certainty.
 */
export async function serveReading(
  body: unknown,
  visitor: ReadingVisitor,
  deps: ServeReadingDeps,
  signal?: AbortSignal,
): Promise<ServeReadingOutcome> {
  const parsed = readingRequestSchema.safeParse(body);
  if (!parsed.success || !isKnownToRegistry(parsed.data, deps.registry)) {
    return { ok: false, failure: "invalid-request" };
  }
  const request = parsed.data;

  const claim = await deps.limiter.claim(visitor.key, visitor.day);
  if (claim !== "granted") return { ok: false, failure: claim };

  let answer: ReadingResult;
  try {
    answer = await deps.provider.interpret(request, { signal });
  } catch (error) {
    if (isAbortError(error)) throw error;
    return {
      ok: false,
      failure:
        error instanceof ReadingUnavailableError ? error.reason : "unavailable",
    };
  }
  return isServable(answer, request)
    ? { ok: true, result: answer }
    : { ok: false, failure: "unavailable" };
}
