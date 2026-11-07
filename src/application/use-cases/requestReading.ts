import type { ReadingProvider } from "@/application/ports/readingProvider";
import {
  readingRequestIdSchema,
  readingRequestSchema,
  readingResultSchema,
} from "@/application/reading/readingSchemas";
import type { ReadingRequest, ReadingResult } from "@/domain/reading/types";

export type ReadingFailure =
  | "invalid-request-id"
  | "invalid-request"
  /** The same request ID was reused for a different request. */
  | "request-id-conflict"
  | "cancelled"
  | "provider-failed"
  /** The provider answered with something that is not a valid reading. */
  | "invalid-result";

export type ReadingOutcome =
  | { readonly ok: true; readonly result: ReadingResult }
  | { readonly ok: false; readonly failure: ReadingFailure };

/** How many recent request IDs are remembered for safe retries. */
export const REMEMBERED_REQUESTS = 20;

interface RememberedRequest {
  readonly fingerprint: string;
  readonly outcome: Promise<ReadingOutcome>;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** A result must answer the request it was given, position for position. */
function answersRequest(
  result: ReadingResult,
  request: ReadingRequest,
): boolean {
  return (
    result.deckId === request.deckId &&
    result.tone === request.tone &&
    result.positions.length === request.positions.length &&
    result.positions.every((position, order) => {
      const asked = request.positions[order];
      return (
        asked !== undefined &&
        position.index === asked.index &&
        position.primary.cardId === asked.primary.id &&
        position.jumper?.cardId === asked.jumper?.id
      );
    })
  );
}

export interface ReadingRequester {
  request(
    requestId: string,
    request: unknown,
    signal?: AbortSignal,
  ): Promise<ReadingOutcome>;
}

/**
 * Validates a request, asks the provider and validates its answer. Retrying
 * with the same request ID returns the same reading instead of asking again;
 * a failed or cancelled attempt is forgotten so that a retry runs anew.
 */
export function createReadingRequester(
  provider: ReadingProvider,
): ReadingRequester {
  const remembered = new Map<string, RememberedRequest>();

  function remember(requestId: string, entry: RememberedRequest): void {
    remembered.set(requestId, entry);
    if (remembered.size <= REMEMBERED_REQUESTS) return;
    const [oldest] = remembered.keys();
    if (oldest !== undefined) remembered.delete(oldest);
  }

  async function interpret(
    request: ReadingRequest,
    signal: AbortSignal | undefined,
  ): Promise<ReadingOutcome> {
    if (signal?.aborted) return { ok: false, failure: "cancelled" };
    let answer: unknown;
    try {
      answer = await provider.interpret(request, { signal });
    } catch (error) {
      return {
        ok: false,
        failure:
          isAbortError(error) || signal?.aborted
            ? "cancelled"
            : "provider-failed",
      };
    }
    if (signal?.aborted) return { ok: false, failure: "cancelled" };

    const parsed = readingResultSchema.safeParse(answer);
    if (!parsed.success || !answersRequest(parsed.data, request)) {
      return { ok: false, failure: "invalid-result" };
    }
    return { ok: true, result: parsed.data };
  }

  return {
    async request(requestId, request, signal) {
      if (!readingRequestIdSchema.safeParse(requestId).success) {
        return { ok: false, failure: "invalid-request-id" };
      }
      const parsed = readingRequestSchema.safeParse(request);
      if (!parsed.success) return { ok: false, failure: "invalid-request" };

      const fingerprint = JSON.stringify(parsed.data);
      const previous = remembered.get(requestId);
      if (previous) {
        return previous.fingerprint === fingerprint
          ? previous.outcome
          : { ok: false, failure: "request-id-conflict" };
      }

      const outcome = interpret(parsed.data, signal);
      remember(requestId, { fingerprint, outcome });
      const settled = await outcome;
      if (!settled.ok) remembered.delete(requestId);
      return settled;
    },
  };
}
