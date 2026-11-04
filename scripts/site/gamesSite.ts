import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { StepFailedError, type Run } from "./process.ts";
import { assertExportFor } from "./staticExport.ts";
import type { SiteConfig } from "./siteConfig.ts";

/** The games site's own publishing check, relative to its checkout. */
const GAMES_SITE_CHECK = "scripts/check-site.mjs";

export interface StageResult {
  /** False when site/<slug>/ already matched the export. */
  readonly changed: boolean;
}

function assertGamesCheckout(gamesDir: string): void {
  if (!existsSync(join(gamesDir, GAMES_SITE_CHECK))) {
    throw new StepFailedError(
      `${gamesDir} does not look like a milespapa-games checkout.`,
    );
  }
}

/**
 * Replaces site/<slug>/ in a milespapa-games checkout with the export and runs
 * that repository's check. It never commits or pushes; releasing stays a
 * deliberate pull request on the games site.
 */
export function stageGamesSite(
  site: SiteConfig,
  exportDir: string,
  gamesDir: string,
  run: Run,
): StageResult {
  assertExportFor(site, exportDir);
  assertGamesCheckout(gamesDir);

  const target = join(gamesDir, "site", site.slug);
  // Replace the folder entirely so no stale chunks survive.
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(exportDir, target, { recursive: true });

  run("node", [GAMES_SITE_CHECK], { cwd: gamesDir });

  const status = run(
    "git",
    ["status", "--porcelain", "--", `site/${site.slug}`],
    { cwd: gamesDir, capture: true },
  );
  return { changed: status.trim().length > 0 };
}
