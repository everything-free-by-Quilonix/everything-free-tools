import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { searchHttpStatus } from "@/engines/developer/http-status";

describe("HTTP Status Code Engine", () => {
  it("finds status entry by code number", () => {
    const results = searchHttpStatus("404");
    assert.ok(results.length > 0);
    assert.equal(results[0]?.code, 404);
    assert.equal(results[0]?.phrase, "Not Found");
    assert.equal(results[0]?.category, "4xx");
  });

  it("finds status entry by text phrase", () => {
    const results = searchHttpStatus("forbidden");
    assert.ok(results.length > 0);
    assert.equal(results[0]?.code, 403);
  });

  it("filters status codes by category", () => {
    const results = searchHttpStatus("", "5xx");
    assert.ok(results.length > 0);
    assert.ok(results.every((r) => r.category === "5xx"));
  });
});
