/**
 * Where this app is published. Every build, preview and release step reads
 * these values, so changing the sub-path or reusing the tooling for another
 * game means editing this file only.
 */
export interface SiteConfig {
  /** Folder on the games site and URL sub-path: games.milespapa.com/<slug>/. */
  readonly slug: string;
  /** Where `next build` writes the static export. */
  readonly exportDir: string;
  /** Where the DEV preview is assembled for Cloudflare Pages. */
  readonly previewDir: string;
}

/** Same rule the games site enforces for its folder names. */
const SLUG_PATTERN = /^[a-z0-9-]+$/u;

export function defineSite(config: SiteConfig): SiteConfig {
  if (!SLUG_PATTERN.test(config.slug)) {
    throw new Error(
      `Site slug "${config.slug}" must use lowercase letters, digits and hyphens.`,
    );
  }
  return Object.freeze({ ...config });
}

export function basePathOf(site: Pick<SiteConfig, "slug">): string {
  return `/${site.slug}`;
}

export const site = defineSite({
  slug: "tarot",
  exportDir: "out",
  previewDir: "preview",
});
