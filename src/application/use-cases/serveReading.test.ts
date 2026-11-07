import { describe, expect, it } from "vitest";
import { ReadingUnavailableError } from "@/application/ports/readingProvider";
import type { UsageClaim } from "@/application/ports/usageLimiter";
import {
  fakeProvider,
  resultFor,
  validRequest,
} from "@/application/reading/testing/readingDoubles";
import { serveReading, usageDayOf } from "@/application/use-cases/serveReading";
import { standardRegistry } from "@/domain/reading/testing/readingFixtures";
import type { ReadingResult } from "@/domain/reading/types";

const visitor = { key: "visitor-hash", day: "2026-11-07" };
const aiResult: ReadingResult = {
  ...resultFor(validRequest),
  source: "ai",
};

function depsWith(
  answer: () => Promise<unknown>,
  claim: UsageClaim = "granted",
) {
  const claims: string[] = [];
  const { provider, calls } = fakeProvider(answer);
  return {
    claims,
    calls,
    deps: {
      registry: standardRegistry,
      provider,
      limiter: {
        claim: async (key: string, day: string) => {
          claims.push(`${key}@${day}`);
          return claim;
        },
      },
    },
  };
}

describe("serveReading", () => {
  it("serves a checked AI reading and counts it for the visitor", async () => {
    const { deps, claims } = depsWith(async () => aiResult);
    expect(await serveReading(validRequest, visitor, deps)).toEqual({
      ok: true,
      result: aiResult,
    });
    expect(claims).toEqual(["visitor-hash@2026-11-07"]);
  });

  it("refuses an invalid or unknown request without counting it", async () => {
    const { deps, claims, calls } = depsWith(async () => aiResult);
    for (const body of [
      { nope: true },
      { ...validRequest, deckId: "someone-elses-deck" },
      {
        ...validRequest,
        positions: [
          {
            ...validRequest.positions[0],
            primary: {
              id: "atelier-standard.major.99",
              orientation: "upright",
            },
          },
        ],
      },
    ]) {
      expect(await serveReading(body, visitor, deps)).toEqual({
        ok: false,
        failure: "invalid-request",
      });
    }
    expect(claims).toEqual([]);
    expect(calls).toEqual([]);
  });

  it.each(["visitor-limit", "daily-limit"] as const)(
    "stops at the %s without asking the AI",
    async (limit) => {
      const { deps, calls } = depsWith(async () => aiResult, limit);
      expect(await serveReading(validRequest, visitor, deps)).toEqual({
        ok: false,
        failure: limit,
      });
      expect(calls).toEqual([]);
    },
  );

  it("passes on why the AI could not answer", async () => {
    const { deps } = depsWith(async () => {
      throw new ReadingUnavailableError("daily-limit", "allocation used up");
    });
    expect(await serveReading(validRequest, visitor, deps)).toEqual({
      ok: false,
      failure: "daily-limit",
      detail: "allocation used up",
    });
  });

  it("refuses an answer that states certainty", async () => {
    const { deps } = depsWith(async () => ({
      ...aiResult,
      synthesis: "你一定會被錄取。",
    }));
    expect(await serveReading(validRequest, visitor, deps)).toEqual({
      ok: false,
      failure: "unavailable",
      detail: "certainty-phrases (一定會)",
    });
  });

  it("refuses an answer that is malformed, pre-written or off-request", async () => {
    for (const [answer, detail] of [
      [{ ...aiResult, positions: [] }, "result-schema"],
      [resultFor(validRequest), "not-ai"],
      [{ ...aiResult, deckId: "other" }, "off-request"],
    ] as const) {
      const { deps } = depsWith(async () => answer);
      expect(await serveReading(validRequest, visitor, deps)).toEqual({
        ok: false,
        failure: "unavailable",
        detail,
      });
    }
  });
});

describe("usageDayOf", () => {
  it("uses the UTC day, when the AI allocation resets", () => {
    // 07:59 on 8 November in Taipei is still 7 November in UTC.
    expect(usageDayOf(new Date("2026-11-07T23:59:00Z"))).toBe("2026-11-07");
    expect(usageDayOf(new Date("2026-11-08T00:00:00Z"))).toBe("2026-11-08");
  });
});
