import { siteUrl } from "./deployment";

export { siteUrl };

export const site = {
  name: "Everything.Free Tools",
  shortName: "EF Tools",
  legalName: "Everything.Free Tools by Quilonix",
  tagline: "Free tools. No account. Just get it done.",
  description:
    "Free tools that run directly in your browser. No account, no upload for local tools, no artificial limits.",
  url: siteUrl,
  locale: "en",
  parent: { name: "Quilonix", url: "https://github.com/everything-free-by-Quilonix" },
  repositoryUrl: "https://github.com/everything-free-by-Quilonix/everything-free-tools",
  issuesUrl: "https://github.com/everything-free-by-Quilonix/everything-free-tools/issues",
  securityUrl: "https://github.com/everything-free-by-Quilonix/everything-free-tools/security/advisories/new",
  /** The sister project: a curated library of free resources. Linked, never imported. */
  libraryUrl: "https://everything-free-by-quilonix.github.io/everything-free/",
} as const;
