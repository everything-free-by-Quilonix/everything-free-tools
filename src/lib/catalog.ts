import { siteUrl } from "@/config/site";
import { processingKind, type ProcessingKind } from "@/lib/processing";
import { getCategory, populatedCategories, tools, toolsInCategory } from "@/tools/registry";

/**
 * The public tool catalogue, published at /tools.json.
 *
 * Other Everything.Free sites (the resource library in particular) list these
 * tools by reading this file, so they never import this project's code and never
 * keep a hand-written copy that drifts. It is built from the registry like every
 * page, and holds only what those pages already show publicly.
 *
 * The shape is versioned. Adding a field is fine; renaming or removing one needs a
 * new `version`, because a consumer validates the file and will refuse it.
 *
 * Deliberately no timestamp, so an unchanged registry produces a byte-identical
 * file and consumers that commit a snapshot see no diff.
 */

export const CATALOG_VERSION = 1;

export interface CatalogCategory {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  toolCount: number;
}

export interface CatalogTool {
  slug: string;
  name: string;
  description: string;
  url: string;
  category: string;
  alsoIn: string[];
  processing: ProcessingKind;
  formats: string[];
  tags: string[];
}

export interface Catalog {
  version: typeof CATALOG_VERSION;
  name: string;
  url: string;
  toolCount: number;
  categories: CatalogCategory[];
  tools: CatalogTool[];
}

export function buildCatalog(): Catalog {
  const url = (path: string) => `${siteUrl}${path}`;
  return {
    version: CATALOG_VERSION,
    name: "Everything.Free Tools",
    url: `${siteUrl}/`,
    toolCount: tools.length,
    categories: populatedCategories().map((category) => ({
      slug: category.slug,
      name: category.name,
      tagline: category.tagline,
      description: category.description,
      url: url(`/categories/${category.slug}/`),
      toolCount: toolsInCategory(category.id).length,
    })),
    tools: tools.map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      description: tool.shortDescription,
      url: url(`/tools/${tool.slug}/`),
      category: getCategory(tool.category).slug,
      alsoIn: (tool.alsoIn ?? []).map((id) => getCategory(id).slug),
      processing: processingKind(tool),
      formats: [...(tool.supportedFormats ?? [])],
      tags: [...new Set([...(tool.tags ?? []), ...tool.keywords])].slice(0, 12),
    })),
  };
}
