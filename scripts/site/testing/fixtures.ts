import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Run, RunOptions } from "../process.ts";
import { defineSite } from "../siteConfig.ts";

export const testSite = defineSite({
  slug: "tarot",
  exportDir: "out",
  previewDir: "preview",
});

export function tempDir(): {
  readonly path: string;
  readonly remove: () => void;
} {
  const path = mkdtempSync(join(tmpdir(), "site-scripts-"));
  return { path, remove: () => rmSync(path, { recursive: true, force: true }) };
}

export function writeFiles(
  root: string,
  files: Readonly<Record<string, string>>,
): void {
  for (const [name, content] of Object.entries(files)) {
    const path = join(root, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}

/** A minimal static export, built for `basePath`. */
export function writeExport(dir: string, basePath = "/tarot"): void {
  writeFiles(dir, {
    "index.html": `<script src="${basePath}/_next/static/chunks/app.js"></script>`,
    "404.html": "<h1>404</h1>",
    "_next/static/chunks/app.js": "console.log('app')",
  });
}

export interface RecordedCall {
  readonly command: string;
  readonly args: readonly string[];
  readonly options: RunOptions;
}

/** A runner that records calls and answers captured commands from `outputs`. */
export function recordingRun(outputs: Readonly<Record<string, string>> = {}) {
  const calls: RecordedCall[] = [];
  const run: Run = (command, args, options = {}) => {
    calls.push({ command, args, options });
    return outputs[command] ?? "";
  };
  return { run, calls };
}

/** Stands in for esbuild: writes a marker file where the bundle would go. */
export function fakeBundle(outFile: string): void {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, "export function onRequestPost() {}");
}
