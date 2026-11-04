// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stageGamesSite } from "./gamesSite.ts";
import {
  recordingRun,
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
  writeExport(join(root, "out"));
  writeFiles(join(root, "games"), {
    "scripts/check-site.mjs": "",
    "site/tarot/_next/static/old-build/stale.js": "stale",
    "site/election/index.html": "election",
  });
});
afterEach(() => cleanup());

const games = () => join(root, "games");
const out = () => join(root, "out");

describe("stageGamesSite", () => {
  it("replaces site/tarot entirely and leaves other games alone", () => {
    const { run } = recordingRun({ git: " M site/tarot/index.html\n" });
    stageGamesSite(testSite, out(), games(), run);

    expect(
      readFileSync(join(games(), "site/tarot/index.html"), "utf8"),
    ).toContain("/tarot/_next/");
    expect(
      existsSync(join(games(), "site/tarot/_next/static/old-build/stale.js")),
    ).toBe(false);
    expect(
      readFileSync(join(games(), "site/election/index.html"), "utf8"),
    ).toBe("election");
  });

  it("runs the games site's own check, then reads git status for site/tarot", () => {
    const { run, calls } = recordingRun({ git: " M site/tarot/index.html\n" });
    const result = stageGamesSite(testSite, out(), games(), run);

    expect(calls).toEqual([
      {
        command: "node",
        args: ["scripts/check-site.mjs"],
        options: { cwd: games() },
      },
      {
        command: "git",
        args: ["status", "--porcelain", "--", "site/tarot"],
        options: { cwd: games(), capture: true },
      },
    ]);
    expect(result.changed).toBe(true);
  });

  it("reports no change when git sees none", () => {
    const { run } = recordingRun({ git: "" });
    expect(stageGamesSite(testSite, out(), games(), run).changed).toBe(false);
  });

  it("refuses a folder that is not a milespapa-games checkout, touching nothing", () => {
    const { run, calls } = recordingRun();
    expect(() => stageGamesSite(testSite, out(), root, run)).toThrow(
      /does not look like a milespapa-games checkout/u,
    );
    expect(calls).toEqual([]);
  });

  it("refuses an export built without the base path, touching nothing", () => {
    writeExport(out(), "");
    const { run, calls } = recordingRun();

    expect(() => stageGamesSite(testSite, out(), games(), run)).toThrow(
      /NEXT_PUBLIC_BASE_PATH=\/tarot/u,
    );
    expect(
      existsSync(join(games(), "site/tarot/_next/static/old-build/stale.js")),
    ).toBe(true);
    expect(calls).toEqual([]);
  });
});
