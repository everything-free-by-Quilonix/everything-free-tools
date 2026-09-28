import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { privacyStatement } from "@/lib/privacy";
import { searchTools } from "@/lib/search";
import {
  categoryList,
  getTool,
  populatedCategories,
  relatedTools,
  tools,
  toolsInCategory,
  type ToolDefinition,
} from "@/tools/registry";
import { toolDefinitions } from "@/tools/registry/definitions";
import { findRegistryProblems } from "@/tools/registry/validate";

describe("Tool registry", () => {
  it("is valid", () => {
    assert.deepEqual(findRegistryProblems(toolDefinitions), []);
  });

  it("has the six launch tools and fifteen categories", () => {
    assert.deepEqual(tools.map((tool) => tool.slug).sort(), [
      "base64",
      "image-compressor",
      "json-formatter",
      "qr-generator",
      "text-counter",
      "uuid-generator",
    ]);
    assert.equal(categoryList.length, 15);
  });

  it("gives category pages only to populated categories", () => {
    for (const category of populatedCategories()) assert.ok(toolsInCategory(category.id).length > 0);
    assert.ok(!populatedCategories().some((category) => category.id === "pdf"));
  });

  it("catches a LOCAL tool that claims data leaves the device, and a NETWORK tool with no destination", () => {
    const base = getTool("base64")!;
    const lying: ToolDefinition = { ...base, privacy: { filesLeaveDevice: true, networkRequired: false } };
    assert.ok(findRegistryProblems([lying]).some((problem) => /LOCAL but says data leaves/.test(problem)));
    const vague: ToolDefinition = {
      ...base,
      processing: "NETWORK",
      privacy: { filesLeaveDevice: true, networkRequired: true },
    };
    assert.ok(findRegistryProblems([vague]).some((problem) => /does not say where data goes/.test(problem)));
    const unknownRelated: ToolDefinition = { ...base, related: ["nope"] };
    assert.ok(findRegistryProblems([unknownRelated]).some((problem) => /unknown tool "nope"/.test(problem)));
  });

  it("returns related tools without the tool itself", () => {
    for (const tool of tools) {
      const related = relatedTools(tool);
      assert.ok(related.length > 0);
      assert.ok(!related.includes(tool));
    }
  });

  it("has a workspace for every tool", () => {
    const source = readFileSync(new URL("../src/tools/workspaces.tsx", import.meta.url), "utf8");
    for (const tool of tools) {
      assert.ok(source.includes(`import("./${tool.slug}/workspace")`), `${tool.slug} has no workspace entry`);
    }
  });
});

describe("Privacy labels", () => {
  it("are derived from the definition and match the required wording", () => {
    for (const tool of tools) {
      const statement = privacyStatement(tool);
      assert.equal(statement.mode, tool.processing);
      if (tool.processing === "LOCAL") {
        assert.equal(statement.headline, "Processed locally in your browser. Your files don't leave your device.");
        assert.equal(tool.privacy.filesLeaveDevice, false);
      }
    }
    const network = privacyStatement({
      processing: "NETWORK",
      privacy: {
        filesLeaveDevice: true,
        networkRequired: true,
        network: { destination: "Example API", dataSent: "the text" },
      },
    });
    assert.equal(network.headline, "This tool requires a network service to process your data.");
    assert.ok(network.points.includes("Sent to: Example API"));
  });
});

describe("Search", () => {
  const top = (query: string) => searchTools(tools, query)[0]?.tool.slug;

  it("finds the right tool for task phrases", () => {
    assert.equal(top("compress image"), "image-compressor");
    assert.equal(top("json pretty"), "json-formatter");
    assert.equal(top("qr wifi"), "qr-generator");
    assert.equal(top("Wi-Fi QR"), "qr-generator");
    assert.equal(top("uuid"), "uuid-generator");
    assert.equal(top("guid"), "uuid-generator");
    assert.equal(top("word count"), "text-counter");
    assert.equal(top("decode base64"), "base64");
    assert.equal(top("shrink photo"), "image-compressor");
    assert.equal(top("compre"), "image-compressor");
  });

  it("returns nothing rather than a wrong answer for tasks that don't exist", () => {
    assert.deepEqual(searchTools(tools, "convert csv json"), []);
    assert.deepEqual(searchTools(tools, "merge pdf"), []);
    assert.deepEqual(searchTools(tools, "   "), []);
  });

  it("is deterministic", () => {
    assert.deepEqual(
      searchTools(tools, "encode").map((result) => result.tool.slug),
      searchTools(tools, "encode").map((result) => result.tool.slug),
    );
  });
});
