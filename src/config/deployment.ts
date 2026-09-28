/**
 * Where the site is deployed.
 *
 * One value, the public URL, decides everything location-dependent: canonical URLs,
 * the sitemap, OpenGraph tags and the base path the static export is built for.
 * The default is the free GitHub Pages address; set `NEXT_PUBLIC_SITE_URL` to
 * deploy elsewhere.
 *
 * Keep this file free of imports: `next.config.ts` imports it directly.
 */

export const DEFAULT_SITE_URL = "https://everything-free-by-quilonix.github.io/everything-free-tools";

function readSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (raw && raw.length > 0 ? raw : DEFAULT_SITE_URL).replace(/\/+$/, "");
}

/** Public URL of the site, with no trailing slash. */
export const siteUrl = readSiteUrl();

/** Path prefix the site is served under: `""` at a domain root, `"/everything-free-tools"` on Pages. */
export const basePath = new URL(siteUrl).pathname.replace(/\/+$/, "");

/** Prefixes a root-relative path with the base path, for anything that bypasses Next's router. */
export function withBasePath(path: string): string {
  return path.startsWith("/") ? `${basePath}${path}` : path;
}
