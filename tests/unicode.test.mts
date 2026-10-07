import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { inspectUnicode } from "@/engines/text/unicode";

describe("Unicode Character Inspector Engine", () => {
  it("inspects standard ASCII characters", () => {
    const details = inspectUnicode("A");
    assert.equal(details.length, 1);
    assert.equal(details[0]?.codePoint, 65);
    assert.equal(details[0]?.hexCodePoint, "U+0041");
    assert.equal(details[0]?.category, "Letter");
    assert.equal(details[0]?.utf8Hex, "41");
  });

  it("inspects multi-byte and surrogate emoji characters", () => {
    // Rocket emoji 🚀: code point 128640 (U+1F680)
    const details = inspectUnicode("🚀");
    assert.equal(details.length, 1);
    assert.equal(details[0]?.codePoint, 0x1f680);
    assert.equal(details[0]?.hexCodePoint, "U+1F680");
    assert.equal(details[0]?.isSurrogatePair, true);
    assert.equal(details[0]?.category, "Symbol");
  });
});
