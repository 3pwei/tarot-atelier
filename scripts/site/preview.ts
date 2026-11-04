import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertExportFor } from "./staticExport.ts";
import { basePathOf, type SiteConfig } from "./siteConfig.ts";

/** Cloudflare Pages host files written at the preview root. */
export function previewHostFiles(site: SiteConfig) {
  return {
    // The preview root has no page of its own.
    _redirects: `/  ${basePathOf(site)}/  302\n`,
    // Previews must never compete with production in search results.
    _headers: "/*\n  X-Robots-Tag: noindex\n",
  } as const;
}

/**
 * Lays out a DEV preview exactly like production: the export lives under
 * `/<slug>/`, so base-path mistakes show up before release.
 */
export function assemblePreview(
  site: SiteConfig,
  exportDir: string,
  previewDir: string,
): void {
  assertExportFor(site, exportDir);

  const appDir = join(previewDir, site.slug);
  rmSync(previewDir, { recursive: true, force: true });
  mkdirSync(appDir, { recursive: true });
  cpSync(exportDir, appDir, { recursive: true });

  // Cloudflare Pages serves the root 404.html for unknown paths.
  cpSync(join(appDir, "404.html"), join(previewDir, "404.html"));
  for (const [name, content] of Object.entries(previewHostFiles(site))) {
    writeFileSync(join(previewDir, name), content);
  }
}
