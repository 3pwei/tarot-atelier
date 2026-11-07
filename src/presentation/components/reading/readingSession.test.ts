import { describe, expect, it } from "vitest";
import { readingRequestIdSchema } from "@/application/reading/readingSchemas";
import {
  resultFor,
  validRequest,
} from "@/application/reading/testing/readingDoubles";
import {
  createRequestId,
  fingerprintOf,
  initialReadingState,
  isStale,
  readingReducer,
} from "@/presentation/components/reading/readingSession";

const fingerprint = fingerprintOf(validRequest);
const loading = readingReducer(initialReadingState, {
  type: "requested",
  requestId: "a",
  fingerprint,
});

describe("readingReducer", () => {
  it("moves from loading to ready with the answer", () => {
    const result = resultFor(validRequest);
    expect(
      readingReducer(loading, {
        type: "answered",
        requestId: "a",
        outcome: { ok: true, result },
      }),
    ).toEqual({ status: "ready", requestId: "a", fingerprint, result });
  });

  it("records a failure for the same attempt", () => {
    expect(
      readingReducer(loading, {
        type: "answered",
        requestId: "a",
        outcome: { ok: false, failure: "provider-failed" },
      }),
    ).toMatchObject({
      status: "failed",
      failure: "provider-failed",
      requestId: "a",
    });
  });

  it("ignores an answer for an attempt that was replaced", () => {
    const replaced = readingReducer(loading, {
      type: "requested",
      requestId: "b",
      fingerprint,
    });
    expect(
      readingReducer(replaced, {
        type: "answered",
        requestId: "a",
        outcome: { ok: true, result: resultFor(validRequest) },
      }),
    ).toBe(replaced);
  });
});

describe("isStale", () => {
  it("compares the shown attempt with the current request", () => {
    expect(isStale(initialReadingState, fingerprint)).toBe(false);
    expect(isStale(loading, fingerprint)).toBe(false);
    expect(
      isStale(loading, fingerprintOf({ ...validRequest, tone: "witty" })),
    ).toBe(true);
    expect(isStale(loading, undefined)).toBe(true);
  });
});

describe("createRequestId", () => {
  it("creates UUIDs the request boundary accepts", () => {
    expect(readingRequestIdSchema.safeParse(createRequestId()).success).toBe(
      true,
    );
    expect(createRequestId()).not.toBe(createRequestId());
  });
});
