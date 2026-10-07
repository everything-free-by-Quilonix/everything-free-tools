import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { jsonToYaml, parseYaml, yamlToJson } from "@/engines/data/yaml";

describe("YAML ↔ JSON Conversion Engine", () => {
  it("converts JSON object to YAML string", () => {
    const data = {
      name: "Everything.Free",
      version: 2,
      active: true,
      features: ["privacy", "offline", "fast"],
    };

    const yaml = jsonToYaml(data);
    assert.ok(yaml.includes("name: Everything.Free"));
    assert.ok(yaml.includes("version: 2"));
    assert.ok(yaml.includes("active: true"));
    assert.ok(yaml.includes("- privacy"));
  });

  it("parses YAML string to JavaScript structure", () => {
    const yaml = `
name: Everything.Free
version: 2
active: true
tags:
  - fast
  - privacy
`;
    const parsed = parseYaml(yaml) as Record<string, unknown>;
    assert.equal(parsed.name, "Everything.Free");
    assert.equal(parsed.version, 2);
    assert.equal(parsed.active, true);
    assert.deepEqual(parsed.tags, ["fast", "privacy"]);
  });

  it("converts YAML to formatted JSON", () => {
    const yaml = `
server:
  host: localhost
  port: 8080
`;
    const json = yamlToJson(yaml);
    const parsed = JSON.parse(json);
    assert.equal(parsed.server.host, "localhost");
    assert.equal(parsed.server.port, 8080);
  });
});
