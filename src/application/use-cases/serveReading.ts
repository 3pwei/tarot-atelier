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
import { certaintyPhrasesIn } from "@/domain/reading/readingSafety";
import type {
  ReadingFallbackReason,
  ReadingRequest,
  ReadingResult,
} from "@/domain/reading/types";

export type ServeReadingFailure = "invalid-request" | ReadingFallbackReason;

export type ServeReadingOutcome =
  | { readonly ok: true; readonly result: ReadingResult }
  | {
      readonly ok: false;
      readonly failure: ServeReadingFailure;
      /** Why, for the server log only; it never quotes player or model text. */
      readonly detail?: string;
    };

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

/**
 * Why an AI answer cannot be shown, or `undefined` when it is well formed,
 * answers the request and is safe. Certainty phrases are named because they
 * come from our own fixed list, not from the answer.
 */
function unservableBecause(
  answer: unknown,
  request: ReadingRequest,
): string | undefined {
  const parsed = readingResultSchema.safeParse(answer);
  if (!parsed.success) return "result-schema";
  if (parsed.data.source !== "ai" || parsed.data.fallback !== undefined) {
    return "not-ai";
  }
  if (!answersRequest(parsed.data, request)) return "off-request";
  const phrases = certaintyPhrasesIn(parsed.data);
  return phrases.length > 0
    ? `certainty-phrases (${phrases.join(", ")})`
    : undefined;
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
    return error instanceof ReadingUnavailableError
      ? { ok: false, failure: error.reason, detail: error.message }
      : { ok: false, failure: "unavailable", detail: "provider-error" };
  }
  const problem = unservableBecause(answer, request);
  return problem === undefined
    ? { ok: true, result: answer }
    : { ok: false, failure: "unavailable", detail: problem };
}
