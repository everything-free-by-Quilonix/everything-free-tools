import type { ToolCategoryId } from "@/tools/registry/types";

/**
 * Curated discovery. The only hand-picked lists on the site, kept here so they are
 * deliberate and easy to review. There are no usage numbers behind them, because
 * nothing is measured: they are simply jobs people often need. The unit tests check
 * that every slug exists in the registry.
 */

/** "Essential tools" on the home page and the empty command palette. */
export const ESSENTIAL_TOOLS: readonly string[] = [
  "json-formatter",
  "image-compressor",
  "qr-generator",
  "base64",
  "uuid-generator",
  "text-diff",
  "unit-converter",
  "timestamp-converter",
];

/** Task shortcuts under the home search: what people type, and where it goes. */
export const HERO_TASKS: readonly { label: string; slug: string }[] = [
  { label: "Compress an image", slug: "image-compressor" },
  { label: "Format JSON", slug: "json-formatter" },
  { label: "Generate a UUID", slug: "uuid-generator" },
  { label: "Compare two texts", slug: "text-diff" },
  { label: "Convert units", slug: "unit-converter" },
];

/** Search suggestions shown when nothing matches. Each one must find at least one tool. */
export const SEARCH_SUGGESTIONS: readonly string[] = ["json", "compress", "image", "password", "csv"];

/**
 * The tools a category page leads with. Optional: without an entry, a category
 * leads with its first tools in registry order.
 */
export const CATEGORY_HIGHLIGHTS: Partial<Record<ToolCategoryId, readonly string[]>> = {
  developer: ["json-formatter", "regex-tester", "jwt-debugger"],
  data: ["csv-json", "json-yaml", "json-path"],
  text: ["text-counter", "text-diff", "case-converter"],
  image: ["image-compressor", "image-resize", "image-format"],
  security: ["password-generator", "hash-generator", "uuid-generator"],
};
