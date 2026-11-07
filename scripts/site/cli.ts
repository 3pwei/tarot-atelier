/**
 * Build and release commands for the published site.
 *
 *   pnpm preview:build                  DEV preview for Cloudflare Pages
 *   pnpm release:stage <games-dir>      Stage a release in milespapa-games
 */
import { stageGamesSite } from "./gamesSite.ts";
import { assemblePreview } from "./preview.ts";
import { run, StepFailedError } from "./process.ts";
import {
  bundleReadingFunction,
  placeReadingFunction,
} from "./readingFunction.ts";
import { basePathOf, site } from "./siteConfig.ts";
import { buildStaticExport } from "./staticExport.ts";

const USAGE = "Usage: cli.ts preview | stage <milespapa-games-dir>";

function preview(): void {
  buildStaticExport(site, "build", run);
  assemblePreview(site, site.exportDir, site.previewDir);
  // Pages deploys Functions from the project root, next to the output folder.
  const endpoint = placeReadingFunction(site, ".", bundleReadingFunction);
  console.log(
    `Preview ready in ${site.previewDir}/ (open ${basePathOf(site)}/), reading endpoint in ${endpoint}.`,
  );
}

function stage(gamesDir: string | undefined): void {
  if (!gamesDir) throw new StepFailedError(USAGE);
  // A release goes through the full quality gate, not just a build.
  buildStaticExport(site, "check", run);
  const { changed } = stageGamesSite(
    site,
    site.exportDir,
    gamesDir,
    run,
    bundleReadingFunction,
  );
  console.log(
    changed
      ? `Staged site/${site.slug}/ and functions/${site.slug}/ in ${gamesDir}. Commit them there as a deploy PR.`
      : `site/${site.slug}/ and functions/${site.slug}/ in ${gamesDir} already match this build.`,
  );
}

function main([command, ...args]: readonly string[]): void {
  switch (command) {
    case "preview":
      return preview();
    case "stage":
      return stage(args[0]);
    default:
      throw new StepFailedError(USAGE);
  }
}

try {
  main(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof StepFailedError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
}
