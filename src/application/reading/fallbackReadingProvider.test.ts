import { describe, expect, it } from "vitest";
import { ReadingUnavailableError } from "@/application/ports/readingProvider";
import { FallbackReadingProvider } from "@/application/reading/fallbackReadingProvider";
import {
  abortError,
  fakeProvider,
  resultFor,
  validRequest,
} from "@/application/reading/testing/readingDoubles";

const aiResult = { ...resultFor(validRequest), source: "ai" as const };

describe("FallbackReadingProvider", () => {
  it("answers with the primary provider when it can", async () => {
    const primary = fakeProvider(async () => aiResult);
    const fallback = fakeProvider(async (r) => resultFor(r));
    const provider = new FallbackReadingProvider(
      { ...primary.provider, source: "ai" },
      fallback.provider,
    );

    expect(await provider.interpret(validRequest)).toEqual(aiResult);
    expect(fallback.calls).toHaveLength(0);
    expect(provider.source).toBe("ai");
  });

  it("falls back and records the reason the primary gave", async () => {
    const primary = fakeProvider(async () => {
      throw new ReadingUnavailableError("visitor-limit", "used up");
    });
    const fallback = fakeProvider(async (r) => resultFor(r));
    const provider = new FallbackReadingProvider(
      primary.provider,
      fallback.provider,
    );

    expect(await provider.interpret(validRequest)).toEqual({
      ...resultFor(validRequest),
      fallback: { reason: "visitor-limit" },
    });
  });

  it("treats an unexpected failure as unavailable", async () => {
    const primary = fakeProvider(async () => {
      throw new TypeError("boom");
    });
    const provider = new FallbackReadingProvider(
      primary.provider,
      fakeProvider(async (r) => resultFor(r)).provider,
    );
    expect((await provider.interpret(validRequest)).fallback).toEqual({
      reason: "unavailable",
    });
  });

  it("does not fall back when the player cancels", async () => {
    const primary = fakeProvider(async () => {
      throw abortError();
    });
    const fallback = fakeProvider(async (r) => resultFor(r));
    const provider = new FallbackReadingProvider(
      primary.provider,
      fallback.provider,
    );
    await expect(provider.interpret(validRequest)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fallback.calls).toHaveLength(0);
  });
});
