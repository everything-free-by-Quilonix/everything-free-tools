import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzeFrequency } from "@/engines/text/frequency";

describe("Word & Character Frequency Engine", () => {
  it("calculates word frequency and ranking", () => {
    const text = "apple banana apple cherry apple banana";
    const res = analyzeFrequency(text);
    assert.equal(res.totalWords, 6);
    assert.equal(res.uniqueWords, 3);
    assert.equal(res.wordFrequency[0]?.word, "apple");
    assert.equal(res.wordFrequency[0]?.count, 3);
    assert.equal(res.wordFrequency[1]?.word, "banana");
    assert.equal(res.wordFrequency[1]?.count, 2);
  });

  it("filters common stop words when enabled", () => {
    const text = "this is the test of the system";
    const res = analyzeFrequency(text, { excludeStopWords: true });
    // "test" and "system" remain
    assert.equal(res.uniqueWords, 2);
    assert.ok(res.wordFrequency.some((w) => w.word === "test"));
    assert.ok(res.wordFrequency.some((w) => w.word === "system"));
  });

  it("calculates character frequency breakdown", () => {
    const text = "aabccc";
    const res = analyzeFrequency(text);
    assert.equal(res.totalChars, 6);
    assert.equal(res.charFrequency[0]?.char, "c");
    assert.equal(res.charFrequency[0]?.count, 3);
  });
});
