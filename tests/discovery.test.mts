import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CATEGORY_HIGHLIGHTS, ESSENTIAL_TOOLS, HERO_TASKS, SEARCH_SUGGESTIONS } from "@/config/discovery";
import { processingKind, processingLabels } from "@/lib/processing";
import { editDistance, searchTools } from "@/lib/search";
import { toSummary } from "@/lib/tool-summary";
import {
  getTool,
  populatedCategories,
  relatedCategories,
  relatedTools,
  tools,
  toolsInCategory,
  type ToolCategoryId,
  type ToolDefinition,
} from "@/tools/registry";
import { findRegistryProblems } from "@/tools/registry/validate";

const top = (query: string) => searchTools(tools, query)[0]?.tool.slug;
const slugs = (query: string) => searchTools(tools, query).map((result) => result.tool.slug);

describe("Search: typo tolerance and partial words", () => {
  it("measures edits, counting a swap of neighbours as one", () => {
    assert.equal(editDistance("format", "format", 2), 0);
    assert.equal(editDistance("fromat", "format", 2), 1);
    assert.equal(editDistance("jsno", "json", 1), 1);
    assert.equal(editDistance("kitten", "sitting", 3), 3);
    assert.ok(editDistance("abcdef", "uvwxyz", 1) > 1, "gives up past the limit");
  });

  it("forgives one typo in a name, task or keyword", () => {
    assert.equal(top("compres image"), "image-compressor");
    assert.equal(top("fromat json"), "json-formatter");
    assert.equal(top("pasword generator"), "password-generator");
    assert.equal(top("timestmap"), "timestamp-converter");
  });

  it("does not forgive typos in short words, where they would match noise", () => {
    assert.deepEqual(searchTools(tools, "jzn"), []);
  });

  it("lists every JSON tool for 'json', with the formatter first", () => {
    const list = slugs("json");
    assert.equal(list[0], "json-formatter");
    for (const slug of ["json-repair", "json-yaml", "json-path", "json-schema"]) assert.ok(list.includes(slug), slug);
  });

  it("matches inside words and while typing", () => {
    assert.ok(slugs("yam").includes("json-yaml"));
    assert.equal(top("uui"), "uuid-generator");
  });

  it("works identically on the slim summaries sent to the browser", () => {
    const summaries = tools.map(toSummary);
    for (const query of ["compress image", "json pretty", "qr wifi", "uuid", "fromat json", "csv"]) {
      assert.deepEqual(
        searchTools(summaries, query).map((result) => result.tool.slug),
        slugs(query),
        query,
      );
    }
  });

  it("returns the same answer from its cache", () => {
    const first = searchTools(tools, "hash");
    assert.equal(searchTools(tools, "hash"), first);
    assert.deepEqual(
      searchTools(tools, "  HASH ").map((r) => r.tool.slug),
      first.map((r) => r.tool.slug),
    );
  });
});

describe("Discovery configuration", () => {
  it("only names tools that exist", () => {
    for (const slug of ESSENTIAL_TOOLS) assert.ok(getTool(slug), `essential tool "${slug}"`);
    for (const task of HERO_TASKS) assert.ok(getTool(task.slug), `hero task "${task.slug}"`);
    for (const [category, list] of Object.entries(CATEGORY_HIGHLIGHTS)) {
      const members = toolsInCategory(category as ToolCategoryId).map((tool) => tool.slug);
      for (const slug of list ?? []) assert.ok(members.includes(slug), `${slug} is not in ${category}`);
    }
  });

  it("suggests only searches that find something", () => {
    for (const suggestion of SEARCH_SUGGESTIONS) assert.ok(searchTools(tools, suggestion).length > 0, suggestion);
  });
});

describe("Registry helpers for navigation", () => {
  it("relates categories to other populated categories, never to themselves", () => {
    const populated = new Set(populatedCategories().map((category) => category.id));
    for (const category of populatedCategories()) {
      const related = relatedCategories(category.id);
      assert.ok(related.length > 0);
      assert.ok(related.every((other) => other.id !== category.id && populated.has(other.id)));
    }
    // Data shares many tools with Developer, so it comes first.
    assert.equal(relatedCategories("data")[0]?.id, "developer");
  });

  it("offers up to six related tools for a tool page", () => {
    const related = relatedTools(getTool("json-formatter")!, 6);
    assert.ok(related.length > 3 && related.length <= 6);
    assert.equal(related[0]?.slug, "json-repair");
  });

  it("gives every category a short tagline", () => {
    for (const category of populatedCategories())
      assert.ok(category.tagline.length > 0 && category.tagline.length < 24);
  });
});

describe("Processing labels", () => {
  it("maps registry modes to the three words people see", () => {
    for (const tool of tools) assert.equal(processingKind(tool), tool.processing === "LOCAL" ? "local" : "network");
    assert.equal(processingKind({ processing: "NETWORK", integrationMode: "external" }), "external");
    assert.equal(processingLabels.local.long, "Processed locally");
    assert.equal(processingLabels.external.explanation, "This capability opens another service.");
  });

  it("requires an external tool to name an https destination and not claim to be local", () => {
    const base = getTool("base64")!;
    const external: ToolDefinition = {
      ...base,
      related: [],
      integrationMode: "external",
      processing: "NETWORK",
      privacy: {
        filesLeaveDevice: true,
        networkRequired: true,
        network: { destination: "Example", dataSent: "the file" },
      },
    };
    assert.ok(findRegistryProblems([external]).some((problem) => /no https externalUrl/.test(problem)));
    assert.deepEqual(findRegistryProblems([{ ...external, externalUrl: "https://example.com/tool" }]), []);
    assert.ok(
      findRegistryProblems([{ ...base, externalUrl: "https://example.com" }]).some((p) =>
        /not marked external/.test(p),
      ),
    );
  });
});
