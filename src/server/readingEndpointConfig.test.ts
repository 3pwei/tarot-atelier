// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fakeWorkersAi } from "@/infrastructure/reading/ai/testing/aiDoubles";
import { sqliteD1 } from "@/infrastructure/reading/usage/testing/sqliteD1";
import {
  READING_ENDPOINT_DEFAULTS,
  readingEndpointConfigOf,
} from "@/server/readingEndpointConfig";

const SALT = "s".repeat(32);
const bindings = () => ({
  AI: fakeWorkersAi(async () => ({ response: "" })).ai,
  USAGE_DB: sqliteD1(),
  VISITOR_SALT: SALT,
});

describe("readingEndpointConfigOf", () => {
  it("uses the defaults when only the bindings and the salt are set", () => {
    const parsed = readingEndpointConfigOf(bindings());
    expect(parsed).toMatchObject({
      ok: true,
      config: {
        model: READING_ENDPOINT_DEFAULTS.model,
        dailyReadings: 150,
        visitorDailyReadings: 5,
        aiTimeoutMs: 45_000,
      },
    });
  });

  it("reads the model and limits from Pages variables, which are strings", () => {
    const parsed = readingEndpointConfigOf({
      ...bindings(),
      AI_MODEL: "@cf/zai-org/glm-4.7-flash",
      DAILY_AI_READINGS: "80",
      VISITOR_DAILY_AI_READINGS: "3",
      AI_TIMEOUT_MS: "30000",
    });
    expect(parsed).toMatchObject({
      ok: true,
      config: {
        model: "@cf/zai-org/glm-4.7-flash",
        dailyReadings: 80,
        visitorDailyReadings: 3,
        aiTimeoutMs: 30_000,
      },
    });
  });

  it("says what to set up when bindings or the salt are missing", () => {
    const parsed = readingEndpointConfigOf({ VISITOR_SALT: "short" });
    expect(parsed.ok).toBe(false);
    const problems = parsed.ok ? [] : parsed.problems;
    expect(problems).toEqual([
      "AI: Add a Workers AI binding named AI.",
      "USAGE_DB: Add a D1 database binding named USAGE_DB.",
      "VISITOR_SALT: Add a secret VISITOR_SALT of at least 32 characters.",
    ]);
    expect(problems.join()).not.toContain("short");
  });

  it("refuses a model wait the browser would not outlast", () => {
    expect(
      readingEndpointConfigOf({ ...bindings(), AI_TIMEOUT_MS: "60000" }).ok,
    ).toBe(false);
  });

  it("refuses a limit below one", () => {
    expect(
      readingEndpointConfigOf({ ...bindings(), DAILY_AI_READINGS: "0" }).ok,
    ).toBe(false);
  });
});
