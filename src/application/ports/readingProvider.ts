import type {
  ReadingFallbackReason,
  ReadingRequest,
  ReadingResult,
  ReadingSource,
} from "@/domain/reading/types";

export interface InterpretOptions {
  /** Aborts the interpretation; providers reject with an AbortError. */
  readonly signal?: AbortSignal;
}

/**
 * Turns a validated reading request into a reading. Implementations may run
 * locally or call a server; none of them name a vendor here, and API keys
 * never pass through this interface.
 */
export interface ReadingProvider {
  /** Stable identifier, used in logs and tests. */
  readonly id: string;
  /** Lets the UI label pre-written readings honestly. */
  readonly source: ReadingSource;
  interpret(
    request: ReadingRequest,
    options?: InterpretOptions,
  ): Promise<ReadingResult>;
}

/**
 * A provider could not read for a known reason, such as a used-up daily
 * limit. Callers can fall back to another provider and tell the player why.
 */
export class ReadingUnavailableError extends Error {
  readonly reason: ReadingFallbackReason;

  constructor(reason: ReadingFallbackReason, message: string) {
    super(message);
    this.name = "ReadingUnavailableError";
    this.reason = reason;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
