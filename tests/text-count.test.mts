import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { countText } from "@/engines/text/count";

describe("Text counter", () => {
  it("counts an empty string as zero everywhere", () => {
    const stats = countText("");
    assert.deepEqual(
      [
        stats.characters,
        stats.words,
        stats.sentences,
        stats.lines,
        stats.paragraphs,
        stats.bytes,
        stats.readingMinutes,
      ],
      [0, 0, 0, 0, 0, 0, 0],
    );
  });

  it("counts words, sentences, lines and paragraphs", () => {
    const text = "Hello world. This is a test!\nSecond line here?\n\nNew paragraph.\n";
    const stats = countText(text);
    assert.equal(stats.words, 11);
    assert.equal(stats.sentences, 4);
    assert.equal(stats.lines, 4);
    assert.equal(stats.paragraphs, 2);
  });

  it("counts grapheme clusters, not code units", () => {
    // e + combining acute, a flag, a family emoji: three visible characters.
    const stats = countText("e\u0301🇮🇳👨‍👩‍👧");
    assert.equal(stats.characters, 3);
    assert.equal(stats.charactersNoSpaces, 3);
  });

  it("counts UTF-8 bytes like TextEncoder", () => {
    for (const text of ["abc", "é", "€", "😀", "ನಮಸ್ಕಾರ", "a\ud800b"]) {
      assert.equal(countText(text).bytes, new TextEncoder().encode(text).length, text);
    }
  });

  it("excludes whitespace from characters without spaces", () => {
    const stats = countText("a b\tc\n");
    assert.equal(stats.characters, 6);
    assert.equal(stats.charactersNoSpaces, 3);
  });

  it("estimates reading time at 230 words per minute, at least one minute", () => {
    assert.equal(countText("word").readingMinutes, 1);
    assert.equal(countText(Array(460).fill("word").join(" ")).readingMinutes, 2);
  });

  it("falls back to a regular expression without Intl.Segmenter", () => {
    const stats = countText("Don't stop. It's fine!", { useSegmenter: false });
    assert.equal(stats.segmenter, false);
    assert.equal(stats.words, 4);
    assert.equal(stats.sentences, 2);
    assert.equal(countText("e\u0301", { useSegmenter: false }).characters, 1);
  });
});
