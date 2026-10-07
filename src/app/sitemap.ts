import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { populatedCategories, tools } from "@/tools/registry";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/tools/", "/categories/", "/about/", "/privacy/", "/accessibility/"];
  return [
    ...pages.map((path) => ({ url: absoluteUrl(path) })),
    ...populatedCategories().map((category) => ({ url: absoluteUrl(`/categories/${category.slug}/`) })),
    ...tools.map((tool) => ({ url: absoluteUrl(`/tools/${tool.slug}/`) })),
  ];
}
