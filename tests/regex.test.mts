import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { explainRegex, testRegex } from "@/engines/developer/regex";

describe("Regex Testing & Explanation Engine", () => {
  it("matches simple patterns and capture groups", () => {
    const res = testRegex("(\\w+)@(\\w+\\.\\w+)", "g", "Contact alice@example.com or bob@test.org");
    assert.equal(res.isValid, true);
    assert.equal(res.matchCount, 2);
    assert.equal(res.matches[0]?.match, "alice@example.com");
    assert.equal(res.matches[0]?.groups[0], "alice");
    assert.equal(res.matches[0]?.groups[1], "example.com");
  });

  it("performs replacement preview with group substitutions", () => {
    const res = testRegex("(\\w+)\\s(\\w+)", "g", "John Doe", "$2, $1");
    assert.equal(res.isValid, true);
    assert.equal(res.replacement, "Doe, John");
  });

  it("explains regex tokens accurately", () => {
    const tokens = explainRegex("^\\d{3}-\\w+$");
    assert.ok(tokens.some((t) => t.part === "^" && t.category === "anchor"));
    assert.ok(tokens.some((t) => t.part === "\\d" && t.category === "class"));
    assert.ok(tokens.some((t) => t.part === "{3}" && t.category === "quantifier"));
    assert.ok(tokens.some((t) => t.part === "\\w" && t.category === "class"));
    assert.ok(tokens.some((t) => t.part === "$" && t.category === "anchor"));
  });

  it("handles invalid regular expression syntax gracefully", () => {
    const res = testRegex("[a-z", "", "test");
    assert.equal(res.isValid, false);
    assert.ok(res.error);
  });
});
