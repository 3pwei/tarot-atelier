// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validRequest } from "@/application/reading/testing/readingDoubles";
import { readingResultSchema } from "@/application/reading/readingSchemas";
import { standardRegistry } from "@/domain/reading/testing/readingFixtures";
import type { ReadingRequest } from "@/domain/reading/types";
import {
  draftFor,
  fakeWorkersAi,
} from "@/infrastructure/reading/ai/testing/aiDoubles";
import { sqliteD1 } from "@/infrastructure/reading/usage/testing/sqliteD1";
import { handleReadingsRequest } from "@/server/readingsEndpoint";

const ORIGIN = "https://games.example";
const ENDPOINT = `${ORIGIN}/tarot/api/v1/readings`;

function setUp(
  answer: (request: ReadingRequest) => Promise<unknown> = async (request) => ({
    response: draftFor(request),
    usage: { prompt_tokens: 900, completion_tokens: 600 },
  }),
  overrides: Record<string, unknown> = {},
) {
  const logs: Record<string, unknown>[] = [];
  const db = sqliteD1();
  const { ai, calls } = fakeWorkersAi(() => answer(validRequest));
  const env = {
    AI: ai,
    USAGE_DB: db,
    VISITOR_SALT: "a-long-random-secret-for-the-tests!",
    VISITOR_DAILY_AI_READINGS: "2",
    ...overrides,
  };
  const call = (
    body: unknown = validRequest,
    headers: Record<string, string> = {},
  ) =>
    handleReadingsRequest(
      new Request(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: ORIGIN,
          "cf-connecting-ip": "203.0.113.7",
          ...headers,
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
      env,
      {
        registry: standardRegistry,
        now: () => new Date("2026-11-07T10:00:00Z"),
        log: (event) => logs.push({ ...event }),
      },
    );
  return { call, logs, calls, db };
}

describe("handleReadingsRequest", () => {
  it("answers a valid request with a checked AI reading", async () => {
    const { call } = setUp();
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as { result: unknown };
    const result = readingResultSchema.parse(body.result);
    expect(result.source).toBe("ai");
    expect(result.positions).toHaveLength(validRequest.positions.length);
  });

  it("limits each visitor per day and says so", async () => {
    const { call, calls } = setUp();
    await call();
    await call();
    const third = await call();
    expect(third.status).toBe(429);
    expect(await third.json()).toEqual({ reason: "visitor-limit" });
    expect(calls).toHaveLength(2);

    const otherVisitor = await call(validRequest, {
      "cf-connecting-ip": "198.51.100.2",
    });
    expect(otherVisitor.status).toBe(200);
  });

  it("stores no address, only a salted hash", async () => {
    const { call, db } = setUp();
    await call();
    const subjects = db.sqlite
      .prepare("SELECT subject FROM reading_usage")
      .all()
      .map((row) => (row as { subject: string }).subject);
    expect(subjects).toContain("site");
    expect(subjects.join()).not.toContain("203.0.113.7");
    expect(subjects.find((s) => s !== "site")).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("says the daily limit is reached when Workers AI's allocation is used up", async () => {
    const { call } = setUp(async () => {
      throw new Error("4006: daily free allocation used up");
    });
    const response = await call();
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ reason: "daily-limit" });
  });

  it("answers 503 when the model's answer cannot be used", async () => {
    const { call } = setUp(async () => ({ response: "一定會成功！" }));
    const response = await call();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ reason: "unavailable" });
  });

  it("refuses other sites, oversized bodies and invalid requests", async () => {
    const { call, calls } = setUp();
    expect(
      (await call(validRequest, { origin: "https://elsewhere.example" }))
        .status,
    ).toBe(403);
    expect((await call("x".repeat(20_000))).status).toBe(413);
    expect((await call("{not json")).status).toBe(400);
    expect((await call({ hello: "world" })).status).toBe(400);
    expect(calls).toEqual([]);
  });

  it("answers 503 and logs what to set up when misconfigured", async () => {
    const { call, logs } = setUp(undefined, { AI: undefined });
    const response = await call();
    expect(response.status).toBe(503);
    expect(logs).toEqual([
      {
        event: "reading.misconfigured",
        problems: ["AI: Add a Workers AI binding named AI."],
      },
    ]);
  });

  it("logs outcomes and token usage but never the questions or the reading", async () => {
    const { call, logs } = setUp();
    await call({ ...validRequest, mainQuestion: "我的私人問題" });
    expect(logs).toEqual([
      {
        event: "reading.ai-usage",
        model: "@cf/google/gemma-4-26b-a4b-it",
        inputTokens: 900,
        outputTokens: 600,
      },
      { event: "reading.served", outcome: "ok" },
    ]);
    expect(JSON.stringify(logs)).not.toMatch(/私人|現況|下一步/u);
  });
});
