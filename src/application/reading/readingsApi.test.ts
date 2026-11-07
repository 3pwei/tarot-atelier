import { describe, expect, it } from "vitest";
import { READING_WAIT_MS } from "@/application/reading/readingsApi";

describe("READING_WAIT_MS", () => {
  it("lets the browser outlast the server's longest wait, so it hears why", () => {
    expect(READING_WAIT_MS.browser).toBeGreaterThan(READING_WAIT_MS.serverMax);
  });
});
