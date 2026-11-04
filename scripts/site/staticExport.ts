import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { StepFailedError, type Run } from "./process.ts";
import { basePathOf, type SiteConfig } from "./siteConfig.ts";

/** `pnpm build` only, or the full `pnpm check` gate that ends with a build. */
export type BuildGate = "build" | "check";

/** Builds the static export with the site's base path. */
export function buildStaticExport(site: SiteConfig, gate: BuildGate, run: Run) {
  run("pnpm", [gate], {
    env: {
      NEXT_PUBLIC_BASE_PATH: basePathOf(site),
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
}

/**
 * Refuses an export that is missing or was built for another base path. Such
 * a build loads its assets from the domain root and breaks once published.
 */
export function assertExportFor(site: SiteConfig, exportDir: string): void {
  const index = join(exportDir, "index.html");
  if (!existsSync(index)) {
    throw new StepFailedError(
      `No static export at ${exportDir}; build it first.`,
    );
  }
  if (!readFileSync(index, "utf8").includes(`${basePathOf(site)}/_next/`)) {
    throw new StepFailedError(
      `${exportDir} was not built with NEXT_PUBLIC_BASE_PATH=${basePathOf(site)}.`,
    );
  }
}
