import { describe, expect, it } from "vitest";
import { standardRegistry } from "@/domain/reading/testing/readingFixtures";
import { createBrowserReadingProvider } from "@/infrastructure/reading/readingProviders";

const config = { endpoint: "/api/v1/readings", timeoutMs: 1_000 };

describe("createBrowserReadingProvider", () => {
  it("reads with pre-written content alone when AI readings are off", () => {
    const provider = createBrowserReadingProvider(standardRegistry, {
      ...config,
      aiReadings: false,
    });
    expect(provider).toMatchObject({ id: "prewritten", source: "prewritten" });
  });

  it("asks AI first and falls back to pre-written content when on", () => {
    const provider = createBrowserReadingProvider(standardRegistry, {
      ...config,
      aiReadings: true,
    });
    expect(provider).toMatchObject({ id: "http+prewritten", source: "ai" });
  });
});
