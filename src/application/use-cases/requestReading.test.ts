import { describe, expect, it } from "vitest";
import {
  createReadingRequester,
  REMEMBERED_REQUESTS,
} from "@/application/use-cases/requestReading";
import {
  abortError,
  fakeProvider,
  OTHER_REQUEST_ID,
  REQUEST_ID,
  resultFor,
  validRequest,
} from "@/application/reading/testing/readingDoubles";

const answers = async (request: typeof validRequest) => resultFor(request);

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
}

describe("createReadingRequester", () => {
  it("returns the provider's validated reading", async () => {
    const { provider } = fakeProvider(answers);
    const outcome = await createReadingRequester(provider).request(
      REQUEST_ID,
      validRequest,
    );
    expect(outcome).toEqual({ ok: true, result: resultFor(validRequest) });
  });

  it("refuses an invalid request before calling the provider", async () => {
    const { provider, calls } = fakeProvider(answers);
    const outcome = await createReadingRequester(provider).request(REQUEST_ID, {
      ...validRequest,
      tone: "unknown",
    });
    expect(outcome).toEqual({ ok: false, failure: "invalid-request" });
    expect(calls).toHaveLength(0);
  });

  it("refuses a request ID that is not a UUID", async () => {
    const { provider, calls } = fakeProvider(answers);
    const outcome = await createReadingRequester(provider).request(
      "1",
      validRequest,
    );
    expect(outcome).toEqual({ ok: false, failure: "invalid-request-id" });
    expect(calls).toHaveLength(0);
  });

  it("answers a retry with the same ID from memory, without asking again", async () => {
    const { provider, calls } = fakeProvider(answers);
    const requester = createReadingRequester(provider);

    const first = await requester.request(REQUEST_ID, validRequest);
    const retry = await requester.request(REQUEST_ID, validRequest);

    expect(retry).toEqual(first);
    expect(calls).toHaveLength(1);
  });

  it("shares one provider call between overlapping retries", async () => {
    const { provider, calls } = fakeProvider(answers);
    const requester = createReadingRequester(provider);

    const [a, b] = await Promise.all([
      requester.request(REQUEST_ID, validRequest),
      requester.request(REQUEST_ID, validRequest),
    ]);
    expect(a).toEqual(b);
    expect(calls).toHaveLength(1);
  });

  it("refuses the same ID for a different request", async () => {
    const { provider } = fakeProvider(answers);
    const requester = createReadingRequester(provider);
    await requester.request(REQUEST_ID, validRequest);

    const outcome = await requester.request(REQUEST_ID, {
      ...validRequest,
      tone: "witty",
    });
    expect(outcome).toEqual({ ok: false, failure: "request-id-conflict" });
  });

  it("forgets failures so that a retry with the same ID runs again", async () => {
    let attempts = 0;
    const { provider, calls } = fakeProvider(async (request) => {
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
      return resultFor(request);
    });
    const requester = createReadingRequester(provider);

    expect(await requester.request(REQUEST_ID, validRequest)).toEqual({
      ok: false,
      failure: "provider-failed",
    });
    expect((await requester.request(REQUEST_ID, validRequest)).ok).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it("reports cancellation when aborted before or during the call", async () => {
    const { provider, calls } = fakeProvider(
      (_, options) =>
        new Promise((_, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(abortError()),
          );
        }),
    );
    const requester = createReadingRequester(provider);

    const early = new AbortController();
    early.abort();
    expect(
      await requester.request(REQUEST_ID, validRequest, early.signal),
    ).toEqual({
      ok: false,
      failure: "cancelled",
    });
    expect(calls).toHaveLength(0);

    const during = new AbortController();
    const pending = requester.request(
      OTHER_REQUEST_ID,
      validRequest,
      during.signal,
    );
    during.abort();
    expect(await pending).toEqual({ ok: false, failure: "cancelled" });
  });

  it("refuses provider output that is not a valid reading", async () => {
    const { provider } = fakeProvider(async () => ({ hello: "world" }));
    expect(
      await createReadingRequester(provider).request(REQUEST_ID, validRequest),
    ).toEqual({ ok: false, failure: "invalid-result" });
  });

  it("refuses a valid-looking reading for different cards", async () => {
    const { provider } = fakeProvider(async (request) => {
      const result = resultFor(request);
      return { ...result, positions: result.positions.slice(0, 1) };
    });
    expect(
      await createReadingRequester(provider).request(REQUEST_ID, validRequest),
    ).toEqual({ ok: false, failure: "invalid-result" });
  });

  it("remembers only the most recent request IDs", async () => {
    const { provider, calls } = fakeProvider(answers);
    const requester = createReadingRequester(provider);
    for (let n = 0; n <= REMEMBERED_REQUESTS; n += 1) {
      await requester.request(uuid(n), validRequest);
    }
    await requester.request(uuid(0), validRequest);
    expect(calls).toHaveLength(REMEMBERED_REQUESTS + 2);
  });
});
