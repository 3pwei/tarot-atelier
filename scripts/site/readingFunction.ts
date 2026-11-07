import { rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildSync } from "esbuild";
import { READINGS_ROUTE } from "../../src/application/reading/readingEndpoint.ts";
import type { SiteConfig } from "./siteConfig.ts";

/** Cloudflare Pages serves Functions from this folder at the project root. */
export const PAGES_FUNCTIONS_DIR = "functions";

const ENTRY = resolve(
  import.meta.dirname,
  "../../src/server/pagesReadingsFunction.ts",
);

/** Bundles the reading endpoint into one file at `outFile`. */
export type BundleFunction = (outFile: string) => void;

/** Where the reading endpoint goes so Pages serves it at /<slug>/<route>. */
export function readingFunctionPath(site: Pick<SiteConfig, "slug">): string {
  return join(PAGES_FUNCTIONS_DIR, site.slug, `${READINGS_ROUTE}.js`);
}

/**
 * One self-contained file, so Pages needs neither this repository's path
 * aliases nor its dependencies to deploy it.
 */
export const bundleReadingFunction: BundleFunction = (outFile) => {
  buildSync({
    entryPoints: [ENTRY],
    outfile: outFile,
    bundle: true,
    format: "esm",
    platform: "neutral",
    mainFields: ["module", "main"],
    conditions: ["worker", "browser"],
    target: "es2022",
    minify: true,
    legalComments: "none",
    logLevel: "warning",
  });
};

/**
 * Writes the reading endpoint below `rootDir`, replacing this site's earlier
 * functions so none survive a rename.
 */
export function placeReadingFunction(
  site: SiteConfig,
  rootDir: string,
  bundle: BundleFunction,
): string {
  rmSync(join(rootDir, PAGES_FUNCTIONS_DIR, site.slug), {
    recursive: true,
    force: true,
  });
  const outFile = join(rootDir, readingFunctionPath(site));
  bundle(outFile);
  return outFile;
}
