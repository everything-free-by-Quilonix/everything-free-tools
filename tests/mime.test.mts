import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { searchMime } from "@/engines/developer/mime";

describe("MIME Type Lookup Engine", () => {
  it("finds MIME entries by extension", () => {
    const results = searchMime("json");
    assert.ok(results.length > 0);
    assert.equal(results[0]?.extension, "json");
    assert.equal(results[0]?.mime, "application/json");
  });

  it("finds MIME entries by MIME type string", () => {
    const results = searchMime("image/webp");
    assert.ok(results.length > 0);
    assert.equal(results[0]?.extension, "webp");
    assert.equal(results[0]?.category, "image");
  });

  it("filters by category", () => {
    const results = searchMime("", "video");
    assert.ok(results.length > 0);
    assert.ok(results.every((r) => r.category === "video"));
  });
});
