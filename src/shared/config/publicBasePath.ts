/**
 * The sub-path the site is served under (`/tarot` in production, empty in
 * development). Set at build time; see docs/deployment.md.
 */
export const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
