import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { siteUrl } from "@/config/site";
import { buildCatalog, CATALOG_VERSION } from "@/lib/catalog";
import { populatedCategories, tools } from "@/tools/registry";

describe("Public tool catalogue (/tools.json)", () => {
  const catalog = buildCatalog();

  it("lists every tool and every populated category, with absolute links into this site", () => {
    assert.equal(catalog.version, CATALOG_VERSION);
    assert.equal(catalog.tools.length, tools.length);
    assert.equal(catalog.toolCount, tools.length);
    assert.equal(catalog.categories.length, populatedCategories().length);
    for (const entry of [...catalog.tools, ...catalog.categories]) {
      assert.ok(entry.url.startsWith(`${siteUrl}/`) && entry.url.endsWith("/"), entry.url);
    }
  });

  it("only refers to categories it publishes", () => {
    const slugs = new Set(catalog.categories.map((category) => category.slug));
    for (const tool of catalog.tools) {
      assert.ok(slugs.has(tool.category), `${tool.slug} → ${tool.category}`);
      for (const extra of tool.alsoIn) assert.ok(slugs.has(extra), `${tool.slug} → ${extra}`);
    }
  });

  it("carries the processing label, never stronger than the registry", () => {
    for (const tool of catalog.tools) {
      const source = tools.find((candidate) => candidate.slug === tool.slug)!;
      if (tool.processing === "local") assert.equal(source.processing, "LOCAL");
      assert.ok(tool.description.length > 0 && tool.description.length <= 100);
    }
  });

  it("is deterministic, so a committed snapshot only changes when the registry does", () => {
    assert.equal(JSON.stringify(buildCatalog()), JSON.stringify(catalog));
  });
});
