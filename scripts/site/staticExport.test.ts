// @vitest-environment node
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertExportFor, buildStaticExport } from "./staticExport.ts";
import {
  recordingRun,
  tempDir,
  testSite,
  writeExport,
} from "./testing/fixtures.ts";

let cleanup: () => void = () => {};
afterEach(() => cleanup());

function exportDir(basePath?: string): string {
  const dir = tempDir();
  cleanup = dir.remove;
  const out = join(dir.path, "out");
  writeExport(out, basePath);
  return out;
}

describe("buildStaticExport", () => {
  it.each(["build", "check"] as const)(
    "runs `pnpm %s` with the site's base path",
    (gate) => {
      const { run, calls } = recordingRun();
      buildStaticExport(testSite, gate, run);
      expect(calls).toEqual([
        {
          command: "pnpm",
          args: [gate],
          options: {
            env: {
              NEXT_PUBLIC_BASE_PATH: "/tarot",
              NEXT_TELEMETRY_DISABLED: "1",
            },
          },
        },
      ]);
    },
  );
});

describe("assertExportFor", () => {
  it("accepts an export built for /tarot", () => {
    expect(() => assertExportFor(testSite, exportDir())).not.toThrow();
  });

  it("refuses an export built without the base path", () => {
    expect(() => assertExportFor(testSite, exportDir(""))).toThrow(
      /not built with NEXT_PUBLIC_BASE_PATH=\/tarot/u,
    );
  });

  it("refuses a missing export", () => {
    const dir = tempDir();
    cleanup = dir.remove;
    expect(() => assertExportFor(testSite, join(dir.path, "out"))).toThrow(
      /No static export/u,
    );
  });
});
