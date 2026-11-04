// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assemblePreview } from "./preview.ts";
import {
  tempDir,
  testSite,
  writeExport,
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

const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("assemblePreview", () => {
  it("serves the app under /tarot/, like production", () => {
    writeExport(join(root, "out"));
    assemblePreview(testSite, join(root, "out"), join(root, "preview"));

    expect(read("preview/tarot/index.html")).toContain("/tarot/_next/");
    expect(
      existsSync(join(root, "preview/tarot/_next/static/chunks/app.js")),
    ).toBe(true);
  });

  it("redirects the root, marks responses noindex and serves the app 404", () => {
    writeExport(join(root, "out"));
    assemblePreview(testSite, join(root, "out"), join(root, "preview"));

    expect(read("preview/_redirects")).toBe("/  /tarot/  302\n");
    expect(read("preview/_headers")).toBe("/*\n  X-Robots-Tag: noindex\n");
    expect(read("preview/404.html")).toBe(read("preview/tarot/404.html"));
  });

  it("starts from an empty folder so no earlier build survives", () => {
    writeFiles(root, { "preview/tarot/_next/old.js": "stale" });
    writeExport(join(root, "out"));
    assemblePreview(testSite, join(root, "out"), join(root, "preview"));

    expect(existsSync(join(root, "preview/tarot/_next/old.js"))).toBe(false);
  });

  it("refuses an export built without the base path and leaves the preview alone", () => {
    writeFiles(root, { "preview/tarot/index.html": "previous" });
    writeExport(join(root, "out"), "");

    expect(() =>
      assemblePreview(testSite, join(root, "out"), join(root, "preview")),
    ).toThrow(/NEXT_PUBLIC_BASE_PATH=\/tarot/u);
    expect(read("preview/tarot/index.html")).toBe("previous");
  });
});
