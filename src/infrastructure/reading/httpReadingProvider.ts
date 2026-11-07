import {
  isAbortError,
  ReadingUnavailableError,
  type InterpretOptions,
  type ReadingProvider,
} from "@/application/ports/readingProvider";
import {
  readingsSuccessSchema,
  readingsUnavailableSchema,
} from "@/application/reading/readingsApi";
import type { ReadingRequest, ReadingResult } from "@/domain/reading/types";

export type Fetch = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "status" | "json">>;

export interface HttpReadingOptions {
  /** The reading endpoint, for example /tarot/api/v1/readings. */
  readonly endpoint: string;
  /** Gives up and falls back after this long; AI readings take seconds. */
  readonly timeoutMs: number;
  readonly fetch?: Fetch;
}

function unavailable(message: string): ReadingUnavailableError {
  return new ReadingUnavailableError("unavailable", message);
}

async function bodyOf(response: Pick<Response, "json">): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * Asks the site's reading endpoint for an AI reading. Every failure becomes
 * a `ReadingUnavailableError` with the server's reason, so the caller can
 * fall back; only the caller's own cancel rejects with an AbortError.
 */
export class HttpReadingProvider implements ReadingProvider {
  readonly id = "http";
  readonly source = "ai" as const;
  readonly #options: HttpReadingOptions;

  constructor(options: HttpReadingOptions) {
    this.#options = options;
  }

  async interpret(
    request: ReadingRequest,
    options: InterpretOptions = {},
  ): Promise<ReadingResult> {
    const { endpoint, timeoutMs } = this.#options;
    const send = this.#options.fetch ?? fetch;
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout;

    let response: Pick<Response, "status" | "json">;
    try {
      response = await send(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
        signal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw unavailable(
        timeout.aborted || isAbortError(error)
          ? `The reading endpoint did not answer within ${timeoutMs} ms.`
          : "The reading endpoint could not be reached.",
      );
    }

    const body = await bodyOf(response);
    options.signal?.throwIfAborted();
    const success = readingsSuccessSchema.safeParse(body);
    if (response.status === 200 && success.success) return success.data.result;

    const refusal = readingsUnavailableSchema.safeParse(body);
    if (refusal.success) {
      throw new ReadingUnavailableError(
        refusal.data.reason,
        `The reading endpoint answered ${response.status}: ${refusal.data.reason}.`,
      );
    }
    throw unavailable(
      `The reading endpoint answered ${response.status} with no usable reading.`,
    );
  }
}
