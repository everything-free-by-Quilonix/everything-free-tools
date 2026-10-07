import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { executeFindReplace } from "@/engines/text/find-replace";

describe("Find and Replace Engine", () => {
  it("replaces literal text case-insensitively", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const res = executeFindReplace(text, { find: "the", replace: "a", caseSensitive: false });
    assert.equal(res.output, "a quick brown fox jumps over a lazy dog");
    assert.equal(res.matchCount, 2);
  });

  it("replaces with regex patterns and capture groups", () => {
    const text = "Order #1234 on 2026-10-02";
    const res = executeFindReplace(text, {
      find: "(\\d{4})-(\\d{2})-(\\d{2})",
      replace: "$2/$3/$1",
      isRegex: true,
    });
    assert.equal(res.output, "Order #1234 on 10/02/2026");
    assert.equal(res.matchCount, 1);
  });

  it("respects whole word matching", () => {
    const text = "cat concatenate catalog cat";
    const res = executeFindReplace(text, { find: "cat", replace: "dog", matchWholeWord: true });
    assert.equal(res.output, "dog concatenate catalog dog");
    assert.equal(res.matchCount, 2);
  });
});
