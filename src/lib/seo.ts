import type { Metadata } from "next";

import { site, siteUrl } from "@/config/site";
import type { ToolDefinition } from "@/tools/registry";

/**
 * Page metadata. Every page sets an absolute canonical URL: a relative one would be
 * resolved against the origin and lose the GitHub Pages base path.
 */

export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildMetadata({
  title,
  description,
  path,
}: {
  title?: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: "en",
      url,
      title: title ? `${title} · ${site.name}` : site.name,
      description,
    },
    twitter: { card: "summary", title: title ?? site.name, description },
  };
}

export function toolSchema(tool: ToolDefinition) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    description: tool.description,
    url: absoluteUrl(`/tools/${tool.slug}/`),
    applicationCategory: tool.category === "developer" ? "DeveloperApplication" : "UtilitiesApplication",
    operatingSystem: "Any (runs in a web browser)",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    publisher: { "@type": "Organization", name: site.parent.name, url: site.parent.url },
  };
}

/** Serialises structured data for a <script> element, so "</script>" in a value can't end it early. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
