// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  bundleReadingFunction,
  placeReadingFunction,
  readingFunctionPath,
} from "./readingFunction.ts";
import {
  fakeBundle,
  tempDir,
  testSite,
  writeFiles,
} from "./testing/fixtures.ts";

let root: string;
let cleanup: () => void;
beforeEach(() => {
  const dir = tempDir();
  root = dir.path;
  cleanup = dir.remove;
});
afterEach(() => cleanup());

describe("reading function", () => {
  it("lives where Pages serves /tarot/api/v1/readings", () => {
    expect(readingFunctionPath(testSite)).toBe(
      "functions/tarot/api/v1/readings.js",
    );
  });

  it("replaces this site's earlier functions only", () => {
    writeFiles(root, {
      "functions/tarot/old.js": "stale",
      "functions/other/keep.js": "keep",
    });
    placeReadingFunction(testSite, root, fakeBundle);
    expect(() => readFileSync(join(root, "functions/tarot/old.js"))).toThrow();
    expect(readFileSync(join(root, "functions/other/keep.js"), "utf8")).toBe(
      "keep",
    );
  });

  it("bundles the endpoint into one file with no path aliases or imports", () => {
    const file = placeReadingFunction(testSite, root, bundleReadingFunction);
    const bundle = readFileSync(file, "utf8");
    expect(bundle).toMatch(/export\s*\{[^}]*onRequestPost/u);
    expect(bundle).not.toMatch(/from\s*"@\//u);
    expect(bundle).not.toMatch(/\bimport\s*["{*]/u);
  });
});
