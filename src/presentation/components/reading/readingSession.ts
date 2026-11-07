import type {
  ReadingFailure,
  ReadingOutcome,
} from "@/application/use-cases/requestReading";
import type { ReadingRequest, ReadingResult } from "@/domain/reading/types";

/**
 * The reading panel's state, kept apart from the spread: cancelling or
 * failing never touches the cards. Each attempt carries the request ID that
 * a retry reuses and the fingerprint of the request it answers.
 */
export type ReadingState =
  | { readonly status: "idle" }
  | {
      readonly status: "loading";
      readonly requestId: string;
      readonly fingerprint: string;
    }
  | {
      readonly status: "failed";
      readonly requestId: string;
      readonly fingerprint: string;
      readonly failure: ReadingFailure;
    }
  | {
      readonly status: "ready";
      readonly requestId: string;
      readonly fingerprint: string;
      readonly result: ReadingResult;
    };

export type ReadingAction =
  | {
      readonly type: "requested";
      readonly requestId: string;
      readonly fingerprint: string;
    }
  | {
      readonly type: "answered";
      readonly requestId: string;
      readonly outcome: ReadingOutcome;
    }
  | { readonly type: "reset" };

export const initialReadingState: ReadingState = { status: "idle" };

export function readingReducer(
  state: ReadingState,
  action: ReadingAction,
): ReadingState {
  switch (action.type) {
    case "requested":
      return {
        status: "loading",
        requestId: action.requestId,
        fingerprint: action.fingerprint,
      };
    case "answered": {
      // An answer for an attempt that was replaced is ignored.
      if (state.status !== "loading" || state.requestId !== action.requestId) {
        return state;
      }
      const { outcome } = action;
      return outcome.ok
        ? { ...state, status: "ready", result: outcome.result }
        : { ...state, status: "failed", failure: outcome.failure };
    }
    case "reset":
      return initialReadingState;
  }
}

/** Identifies a request's content; equal requests share a fingerprint. */
export function fingerprintOf(request: ReadingRequest): string {
  return JSON.stringify(request);
}

/** True when the shown reading no longer matches the spread or the tone. */
export function isStale(
  state: ReadingState,
  currentFingerprint: string | undefined,
): boolean {
  return state.status !== "idle" && state.fingerprint !== currentFingerprint;
}

/** A version-4 UUID, even where `crypto.randomUUID` is unavailable. */
export function createRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10, 16),
  ]
    .map((group) => group.join(""))
    .join("-");
}
