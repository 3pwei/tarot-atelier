// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  abortError,
  resultFor,
  validRequest,
} from "@/application/reading/testing/readingDoubles";
import {
  HttpReadingProvider,
  type Fetch,
} from "@/infrastructure/reading/httpReadingProvider";

const aiResult = { ...resultFor(validRequest), source: "ai" as const };

function answering(status: number, body: unknown) {
  const calls: { input: string; init: RequestInit }[] = [];
  const fetch: Fetch = async (input, init) => {
    calls.push({ input, init });
    return { status, json: async () => body };
  };
  return {
    calls,
    provider: new HttpReadingProvider({
      endpoint: "/tarot/api/v1/readings",
      timeoutMs: 1_000,
      fetch,
    }),
  };
}

afterEach(() => vi.useRealTimers());

describe("HttpReadingProvider", () => {
  it("posts the request to the endpoint and returns the reading", async () => {
    const { provider, calls } = answering(200, { result: aiResult });
    expect(await provider.interpret(validRequest)).toEqual(aiResult);
    expect(calls[0]?.input).toBe("/tarot/api/v1/readings");
    expect(calls[0]?.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual(validRequest);
  });

  it.each([
    [429, "visitor-limit"],
    [429, "daily-limit"],
    [503, "unavailable"],
  ] as const)("passes on a %i with reason %s", async (status, reason) => {
    const { provider } = answering(status, { reason });
    await expect(provider.interpret(validRequest)).rejects.toMatchObject({
      name: "ReadingUnavailableError",
      reason,
    });
  });

  it("treats a missing endpoint or an unusable answer as unavailable", async () => {
    for (const [status, body] of [
      [404, undefined],
      [200, { result: { nope: true } }],
      [400, { error: "invalid-request" }],
    ] as const) {
      const { provider } = answering(status, body);
      await expect(provider.interpret(validRequest)).rejects.toMatchObject({
        reason: "unavailable",
      });
    }
  });

  it("treats a network failure as unavailable", async () => {
    const provider = new HttpReadingProvider({
      endpoint: "/x",
      timeoutMs: 1_000,
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    await expect(provider.interpret(validRequest)).rejects.toThrow(
      /could not be reached/u,
    );
  });

  it("gives up after the timeout so the player is not kept waiting", async () => {
    const provider = new HttpReadingProvider({
      endpoint: "/x",
      timeoutMs: 50,
      fetch: (_, init) =>
        new Promise((_, reject) =>
          init.signal?.addEventListener("abort", () => reject(abortError())),
        ),
    });
    await expect(provider.interpret(validRequest)).rejects.toMatchObject({
      reason: "unavailable",
      message: expect.stringMatching(/within 50 ms/u),
    });
  });

  it("rejects with an AbortError when the player cancels", async () => {
    const controller = new AbortController();
    const provider = new HttpReadingProvider({
      endpoint: "/x",
      timeoutMs: 1_000,
      fetch: (_, init) =>
        new Promise((_, reject) =>
          init.signal?.addEventListener("abort", () => reject(abortError())),
        ),
    });
    const pending = provider.interpret(validRequest, {
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
