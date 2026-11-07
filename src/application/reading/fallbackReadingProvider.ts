import {
  isAbortError,
  ReadingUnavailableError,
  type InterpretOptions,
  type ReadingProvider,
} from "@/application/ports/readingProvider";
import type {
  ReadingFallbackReason,
  ReadingRequest,
  ReadingResult,
} from "@/domain/reading/types";

function reasonOf(error: unknown): ReadingFallbackReason {
  return error instanceof ReadingUnavailableError
    ? error.reason
    : "unavailable";
}

/**
 * Asks the primary provider first and, when it cannot answer, the fallback,
 * so a player always gets a reading. The result then records why the
 * fallback answered. Cancelling stops both and is never treated as a failure.
 */
export class FallbackReadingProvider implements ReadingProvider {
  readonly id: string;
  readonly source;
  readonly #primary: ReadingProvider;
  readonly #fallback: ReadingProvider;

  constructor(primary: ReadingProvider, fallback: ReadingProvider) {
    this.id = `${primary.id}+${fallback.id}`;
    this.source = primary.source;
    this.#primary = primary;
    this.#fallback = fallback;
  }

  async interpret(
    request: ReadingRequest,
    options: InterpretOptions = {},
  ): Promise<ReadingResult> {
    try {
      return await this.#primary.interpret(request, options);
    } catch (error) {
      if (isAbortError(error) || options.signal?.aborted) throw error;
      const result = await this.#fallback.interpret(request, options);
      return { ...result, fallback: { reason: reasonOf(error) } };
    }
  }
}
